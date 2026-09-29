#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

// ============================================================
// MEDJARVIS - FINAL DUAL MODE ESP32 FIRMWARE
// ============================================================
//
// ESP32
//
// MAX30102 -> SpO2, Heart Rate, IR/PPG, Signal Quality, HRV
// MPU6050  -> Accelerometer, Gyroscope, Tilt
// DS18B20  -> Temperature
//
// TWO MODES:
//
// 1. SPOT_MODE
//    - One measurement
//    - 60 seconds
//    - Final processed result
//    - One backend POST
//    - No emergency/fall detection
//    - Does not automatically repeat
//
// 2. CONTINUOUS_MODE
//    - One uninterrupted MAX30102 acquisition session
//    - Latest validated HR/SpO2 values update as they become available
//    - Backend/live dashboard updates periodically
//    - MPU6050 and temperature continue independently
//    - Fall/high-motion detection enabled
//    - Emergency event flag can be sent
//
// IMPORTANT:
// This is a prototype measurement system.
// It is NOT a clinically validated medical device.
//
// The ESP32 does not independently diagnose disease.
// Sensor readings must be interpreted in clinical context.
//
// ============================================================


// ============================================================
// WIFI
// ============================================================

const char* WIFI_SSID = "OPPO K13 5G w5pb";
const char* WIFI_PASSWORD = "AAAAAAAA8";


// ============================================================
// MEDJARVIS BACKEND
// ============================================================

const char* BAND_ID = "BAND-MJ-001";

const char* MEDJARVIS_API =
  "http://10.56.101.183:5000/api/vitals";

const char* MEDJARVIS_EMERGENCY_API =
  "http://10.56.101.183:5000/api/emergency";

const char* MEDJARVIS_CONTROL_API =
  "http://10.56.101.183:5000/api/vitals/control";


// ============================================================
// PINS
// ============================================================

#define SDA_PIN       21
#define SCL_PIN       22
#define ONE_WIRE_PIN  4


// ============================================================
// SENSOR OBJECTS
// ============================================================

MAX30105 maxSensor;

Adafruit_MPU6050 mpu;

OneWire oneWire(ONE_WIRE_PIN);

DallasTemperature ds18b20(&oneWire);

bool maxSensorPresent = false;
bool mpuSensorPresent = false;


// ============================================================
// MONITORING MODES
// ============================================================

#define SPOT_MODE       1
#define CONTINUOUS_MODE 2

// ------------------------------------------------------------
// MODE IS NOW SELECTED FROM THE MEDJARVIS FRONTEND.
// The ESP32 starts IDLE and waits for a START command.
// ------------------------------------------------------------

int CURRENT_MODE = SPOT_MODE;


// ============================================================
// MEASUREMENT SETTINGS
// ============================================================

// Spot measurement = 60 seconds.
const unsigned long SPOT_DURATION = 60000UL;

// Continuous mode is a live acquisition session, not repeated
// independent 5-second measurements.
// Continuous dashboard cadence is intentionally split into two pipelines:
//   - Motion + temperature: approximately every 1 second
//   - HR + SpO2 + HRV: approximately every 15 seconds
// MAX30102 acquisition itself remains continuous in its FreeRTOS task.
const unsigned long CONTINUOUS_UPDATE_INTERVAL = 1000UL;
const unsigned long CONTINUOUS_PHYSIO_UPDATE_INTERVAL = 15000UL;
const unsigned long CONTINUOUS_VALUE_FRESHNESS = 5000UL;
const unsigned long CONTINUOUS_CONTROL_INTERVAL = 500UL;

// Physiological values are real validated values only. They may be used for
// the first dashboard physiological update after the initial 20-second
// acquisition period. No value is fabricated when validation has failed.
const unsigned long CONTINUOUS_PHYSIO_WARMUP = 20000UL;


// ============================================================
// FINGER DETECTION
// ============================================================

const unsigned long FINGER_STABLE_TIME = 1000UL;

const long FINGER_THRESHOLD = 10000;

const uint32_t MAX_VALID_IR = 260000;


// ============================================================
// MAX30102 CONFIGURATION
// ============================================================

const byte MAX_LED_BRIGHTNESS = 0x0A;

const byte MAX_SAMPLE_AVERAGE = 1;

const byte MAX_LED_MODE = 2;       // RED + IR

const int MAX_SAMPLE_RATE = 100;

const int MAX_PULSE_WIDTH = 411;

const int MAX_ADC_RANGE = 4096;


// ============================================================
// SPO2 PROCESSING
// ============================================================
//
// Maxim/SparkFun algorithm requires 100 samples.
//
// IMPORTANT:
// The firmware uses a rolling 100-sample SpO2 window. After each
// complete window, the newest 75 samples are retained and the next
// 25 samples complete the next overlapping window.
//
// Example:
//
// 60 sec at 100 Hz
// approximately 6000 samples
//
// At 100 Hz, a new overlapping result is produced about every
// 250 ms after the first 100 samples.
//
// Valid windows are averaged for the Spot final SpO2; Continuous mode
// uses the newest validated window.
//
// ============================================================

#define SPO2_WINDOW_SIZE 100

uint32_t irBuffer[SPO2_WINDOW_SIZE];

uint32_t redBuffer[SPO2_WINDOW_SIZE];

byte spo2BufferIndex = 0;

unsigned long totalValidSpO2Samples = 0;

unsigned long totalSpO2Windows = 0;

unsigned long validSpO2Windows = 0;

float spo2Sum = 0.0;

float algorithmHRSum = 0.0;

unsigned long validAlgorithmHRWindows = 0;


// Final SpO2.
int finalSpO2 = 0;


// ============================================================
// HEART RATE
// ============================================================

#define RATE_SIZE 12

// Physiological-value validation: never expose a single beat/window as a
// dashboard vital. A value becomes display-ready only after several
// independent measurements agree.
#define PHYSIO_VALIDATION_SIZE 40
#define MIN_VALID_HR_SAMPLES 5
#define MIN_VALID_SPO2_WINDOWS 5
#define HR_STABILITY_PERCENT 0.20
#define SPO2_STABILITY_POINTS 3

byte rates[RATE_SIZE];

byte rateSpot = 0;

byte validRateCount = 0;

unsigned long lastBeat = 0;

float currentBPM = 0.0;

int averageBPM = 0;

int medianBPM = 0;

byte hrValidationCount = 0;
byte spo2ValidationCount = 0;
int hrValidationValues[PHYSIO_VALIDATION_SIZE];
int spo2ValidationValues[PHYSIO_VALIDATION_SIZE];

// Separate validation history for the Maxim algorithm's window-HR output.
byte algorithmHRValidationCount = 0;
int algorithmHRValidationValues[PHYSIO_VALIDATION_SIZE];

// Full-session validated candidate buffers used by 60-second Spot mode.
// Raw 100 Hz PPG is never retained for the whole minute; only validated
// physiological candidates are retained for robust final aggregation.
#define SPOT_AGGREGATION_SIZE 256
int16_t spotSpO2Values[SPOT_AGGREGATION_SIZE];
int16_t spotHRValues[SPOT_AGGREGATION_SIZE];
uint16_t spotRRValues[SPOT_AGGREGATION_SIZE];
uint16_t spotSpO2Count = 0;
uint16_t spotHRCount = 0;
uint16_t spotRRCount = 0;

// Shared scratch buffers keep large temporary arrays off the FreeRTOS
// MAX30102 task stack.
int aggregationScratch[SPOT_AGGREGATION_SIZE];
float rrScratch[SPOT_AGGREGATION_SIZE];

float spotSpO2Confidence = 0.0;
float spotHRConfidence = 0.0;
float spotHRVConfidence = 0.0;
float measurementConfidence = 0.0;

float continuousSpO2Confidence = 0.0;
float continuousHRConfidence = 0.0;
float continuousHRVConfidence = 0.0;
float continuousMeasurementConfidence = 0.0;


// ============================================================
// HRV
// ============================================================

#define RR_BUFFER_SIZE 40

float rrIntervals[RR_BUFFER_SIZE];

byte rrSpot = 0;

byte rrCount = 0;

float hrvSDNN = 0.0;
byte validRRForHRV = 0;

// ------------------------------------------------------------
// INDEPENDENT HRV BEAT DETECTOR
// This detector is used ONLY to obtain beat-to-beat RR intervals
// for HRV. It does not modify the existing Heart Rate pipeline.
// ------------------------------------------------------------
float hrvBaseline = 0.0;
float hrvSmoothedAC = 0.0;
float hrvPreviousAC = 0.0;
float hrvPreviousPreviousAC = 0.0;
float hrvAmplitude = 0.0;
unsigned long hrvLastPeakTime = 0;
bool hrvDetectorInitialized = false;
const float HRV_BASELINE_ALPHA = 0.005;
const float HRV_SMOOTH_ALPHA = 0.30;
const float HRV_AMPLITUDE_ALPHA = 0.01;
const float HRV_MIN_PEAK_THRESHOLD = 25.0;
const float HRV_PEAK_FRACTION = 0.35;
const unsigned long HRV_REFRACTORY_MS = 333UL;


// ============================================================
// RAW MAX30102 VALUES
// ============================================================

long currentIR = 0;

long currentRed = 0;


// ============================================================
// MPU6050 VALUES
// ============================================================

float accelX = 0.0;

float accelY = 0.0;

float accelZ = 0.0;

float gyroX = 0.0;

float gyroY = 0.0;

float gyroZ = 0.0;

float tiltAngle = 0.0;


// ============================================================
// MPU ACCUMULATION
// ============================================================

float accelMagnitudeSum = 0.0;

float gyroMagnitudeSum = 0.0;

float tiltSum = 0.0;

unsigned long mpuSampleCount = 0;


// ============================================================
// TEMPERATURE
// ============================================================

float temperatureC = 0.0;

bool temperatureSensorPresent = false;
bool temperatureReadingValid = false;

bool temperatureConversionRunning = false;

unsigned long lastTemperatureRequest = 0;

const unsigned long TEMPERATURE_INTERVAL = 1000UL;

const uint8_t TEMPERATURE_RESOLUTION = 10;


// ============================================================
// SIGNAL QUALITY
// ============================================================

int signalQuality = 0;


// ============================================================
// MEASUREMENT STATE
// ============================================================

bool measurementRunning = false;

bool fingerDetected = false;

bool stableFingerDetected = false;

// True when the finger has been continuously absent long enough
// to invalidate the current acquisition window. The current window
// is discarded and the user must place the finger back.
bool fingerLossDetected = false;
unsigned long fingerMissingStart = 0;
const unsigned long FINGER_LOSS_GRACE_TIME = 1000UL;

unsigned long measurementStartTime = 0;

unsigned long measurementEndTime = 0;

unsigned long fingerStableStart = 0;


// ============================================================
// SAMPLE COUNTERS
// ============================================================

unsigned long maxSampleCount = 0;
unsigned long sampleRateWindowStart = 0;
unsigned long sampleRateWindowCount = 0;


// ============================================================
// CONTINUOUS MONITORING
// ============================================================

bool continuousMonitoring = false;

bool monitoringActive = false;

bool fallEventDetected = false;
float fallEventConfidence = 0.0;

// Multi-stage fall detector:
// 0 idle, 1 impact candidate, 2 post-impact confirmation, 3 confirmed.
byte fallState = 0;
unsigned long fallCandidateTime = 0;
unsigned long fallImpactTime = 0;
unsigned long fallStillnessStart = 0;
float fallPreImpactTilt = 0.0;
float fallCandidatePeakAccel = 0.0;
float fallCandidatePeakGyro = 0.0;
bool fallOrientationChanged = false;
unsigned long lastConfirmedFallTime = 0;

const float FALL_IMPACT_ACCEL_THRESHOLD = 22.0;
const float FALL_IMPACT_GYRO_THRESHOLD = 4.5;
const float FALL_POSTURE_CHANGE_DEGREES = 35.0;
const float FALL_STILL_ACCEL_MAX = 13.5;
const float FALL_STILL_GYRO_MAX = 1.25;
const unsigned long FALL_CANDIDATE_WINDOW = 2500UL;
const unsigned long FALL_STILLNESS_CONFIRM_TIME = 1800UL;
const unsigned long FALL_EVENT_COOLDOWN = 10000UL;

// Continuous acquisition task. MAX30102 is serviced continuously so
// network requests never starve its FIFO.
TaskHandle_t max30102TaskHandle = nullptr;
TaskHandle_t motionTaskHandle = nullptr;
SemaphoreHandle_t i2cMutex = nullptr;
volatile bool continuousAcquisitionStopRequested = false;
volatile bool continuousAcquisitionTaskRunning = false;
volatile bool motionTaskStopRequested = false;
volatile bool motionTaskRunning = false;

unsigned long continuousSessionStart = 0;
unsigned long lastContinuousBackendUpdate = 0;
unsigned long lastContinuousPhysioUpdate = 0;
unsigned long lastContinuousControlCheck = 0;

// Prevent a completed Spot session whose backend completion request was
// delayed/failed from being interpreted as a brand-new START. A new Spot
// command must first be observed in the backend as inactive and then active.
bool spotAwaitingFreshStart = false;

// Latest validated physiological values. These are updated only when
// the corresponding algorithm produces a valid result.
volatile int latestValidatedSpO2 = 0;
volatile int latestValidatedHeartRate = 0;
volatile unsigned long latestSpO2Update = 0;
volatile unsigned long latestHeartRateUpdate = 0;

// Recent real MAX30102 IR samples for a live PPG visualization.
// These are raw sensor values; the frontend normalizes them for display.
#define PPG_WAVEFORM_SIZE 256
#define PPG_BEAT_HISTORY_SIZE 16
portMUX_TYPE ppgMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t ppgWaveform[PPG_WAVEFORM_SIZE];
volatile byte ppgWaveformIndex = 0;
volatile uint16_t ppgWaveformCount = 0;
volatile uint32_t ppgSampleSequence = 0;
volatile uint32_t ppgBeatSequence[PPG_BEAT_HISTORY_SIZE];
volatile byte ppgBeatSequenceCount = 0;

unsigned long lastControlCheck = 0;

const unsigned long CONTROL_CHECK_INTERVAL = 500UL;


// ============================================================
// SENSOR STATUS TELEMETRY
// ESP32 -> Backend -> Socket.IO -> Frontend
// Status is sent only on meaningful state changes / progress.
// ============================================================

String lastSensorStatus = "";

void sendSensorStatus(
  const char* status,
  const char* message,
  int remainingSeconds = -1
);

void resetSensorStatusState();


// ============================================================
// FALL DETECTION
// ============================================================
//
// Prototype thresholds only.
//
// These values are NOT clinically validated.
//
// Fall detection is completely disabled in Spot mode.
//
// ============================================================


// ============================================================
// FUNCTION DECLARATIONS
// ============================================================

void connectWiFi();

void resetMeasurementData();

void serviceMAX30102();

void processMAXSample(
  uint32_t irValue,
  uint32_t redValue
);

void processHeartbeat(
  uint32_t irValue,
  unsigned long sampleTime
);

void processSpO2Window();

void calculateFinalSpO2();

void calculateHeartRateAverage();

void calculateMedianHeartRate();

void calculateHRV();
void processIndependentHRVBeat(
  uint32_t irValue,
  unsigned long sampleTime
);

void calculateSignalQuality();

bool heartRateCandidateStable();
bool spO2CandidateStable();
void recordHeartRateCandidate(int bpm);
int getRobustSpotHeartRate();
int getRobustSpotSpO2();
int getValidatedSpotHeartRate()
{
  return getRobustSpotHeartRate();
}


void recordAlgorithmHeartRateCandidate(int bpm)
{
  if (bpm < 40 || bpm > 180)
  {
    return;
  }

  if (algorithmHRValidationCount < PHYSIO_VALIDATION_SIZE)
  {
    algorithmHRValidationValues[
      algorithmHRValidationCount++
    ] = bpm;
  }
  else
  {
    for (
      byte i = 1;
      i < PHYSIO_VALIDATION_SIZE;
      i++
    )
    {
      algorithmHRValidationValues[i - 1] =
        algorithmHRValidationValues[i];
    }

    algorithmHRValidationValues[
      PHYSIO_VALIDATION_SIZE - 1
    ] = bpm;
  }
}


bool algorithmHeartRateCandidateStable()
{
  if (
    algorithmHRValidationCount < MIN_VALID_HR_SAMPLES
  )
  {
    return false;
  }

  int minValue =
    algorithmHRValidationValues[0];

  int maxValue =
    algorithmHRValidationValues[0];

  float sum = 0.0;

  for (
    byte i = 0;
    i < algorithmHRValidationCount;
    i++
  )
  {
    int value =
      algorithmHRValidationValues[i];

    if (value < minValue)
    {
      minValue = value;
    }

    if (value > maxValue)
    {
      maxValue = value;
    }

    sum += value;
  }

  float mean =
    sum /
    algorithmHRValidationCount;

  if (mean <= 0.0)
  {
    return false;
  }

  return
    (float)(maxValue - minValue) <=
    mean * HR_STABILITY_PERCENT;
}


int getValidatedAlgorithmHeartRate()
{
  if (!algorithmHeartRateCandidateStable())
  {
    return 0;
  }

  float sum = 0.0;

  for (
    byte i = 0;
    i < algorithmHRValidationCount;
    i++
  )
  {
    sum +=
      algorithmHRValidationValues[i];
  }

  return
    (int)round(
      sum /
      algorithmHRValidationCount
    );
}


void recordSpO2Candidate(int spo2);

void runSpotMeasurement();

void readMPU();

void updateContinuousFallDetection();
float calculateSpO2Confidence();
float calculateHeartRateConfidence();
float calculateHRVConfidence();
void updateContinuousValidatedValues();

// ============================================================
// CONTINUOUS MONITORING
// ============================================================

void runContinuousMonitoring()
{
  continuousMonitoring = true;
  monitoringActive = true;

  Serial.println();
  Serial.println("================================================");
  Serial.println("      MEDJARVIS CONTINUOUS MONITORING");
  Serial.println("================================================");
  Serial.println("Live MAX30102 acquisition: ENABLED");
  Serial.println("MPU6050 motion pipeline: ENABLED");
  Serial.println("DS18B20 temperature pipeline: ENABLED");
  Serial.println("Fall/high-motion detection: ENABLED");
  Serial.println("Motion/temperature dashboard update: ~1 second");
  Serial.println("HR/SpO2/HRV dashboard update: ~15 seconds");
  Serial.println("Physiological warm-up: ~20 seconds");
  Serial.println();

  if (!maxSensorPresent)
  {
    sendSensorStatus("SENSOR_ERROR", "MAX30102 sensor is not available.", -1);
    continuousMonitoring = false;
    monitoringActive = false;
    goto continuous_cleanup;
  }

  waitForStableFinger();

  if (!continuousMonitoring || !monitoringActive)
    goto continuous_cleanup;

  resetMeasurementData();

  measurementRunning = true;
  stableFingerDetected = true;
  continuousSessionStart = millis();
  lastContinuousBackendUpdate = millis();
  lastContinuousPhysioUpdate = millis();
  lastContinuousControlCheck = millis();

  if (i2cMutex != nullptr)
  {
    if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE)
    {
      maxSensor.clearFIFO();
      xSemaphoreGive(i2cMutex);
    }
  }
  else
  {
    maxSensor.clearFIFO();
  }

  if (temperatureSensorPresent)
    startTemperatureConversion();

  sendSensorStatus(
    "MEASURING",
    "Continuous live monitoring is active. Physiological values update when validated sensor results are available.",
    -1
  );

  startContinuousAcquisitionTask();
  startContinuousMotionTask();

  if (max30102TaskHandle == nullptr || motionTaskHandle == nullptr)
  {
    sendSensorStatus(
      "SENSOR_ERROR",
      "Unable to start the continuous sensor processing tasks.",
      -1
    );

    continuousMonitoring = false;
    monitoringActive = false;
    measurementRunning = false;
    goto continuous_cleanup;
  }

  while (continuousMonitoring && monitoringActive)
  {
    if (millis() - lastContinuousControlCheck >= CONTINUOUS_CONTROL_INTERVAL)
    {
      checkMonitoringCommand();
      lastContinuousControlCheck = millis();
    }

    if (!continuousMonitoring || !monitoringActive)
      break;

    if (millis() - lastContinuousBackendUpdate >= CONTINUOUS_UPDATE_INTERVAL)
    {
      if (fingerLossDetected)
      {
        Serial.println("Continuous monitoring: finger loss detected; optical state will be discarded.");
      }
      else
      {
        calculateSignalQuality();

        bool physiologicalUpdateDue =
          (millis() - continuousSessionStart >= CONTINUOUS_PHYSIO_WARMUP) &&
          (millis() - lastContinuousPhysioUpdate >= CONTINUOUS_PHYSIO_UPDATE_INTERVAL);

        // This network cadence never controls MAX30102 acquisition.
        sendVitalsToBackend(physiologicalUpdateDue);

        if (physiologicalUpdateDue)
          lastContinuousPhysioUpdate = millis();

        if (fallEventDetected)
        {
          Serial.println();
          Serial.println("!!! CONFIRMED FALL EVENT DETECTED !!!");
          sendEmergencyEvent();
          fallEventDetected = false;
          fallEventConfidence = 0.0;
          fallState = 3;
        }
      }

      lastContinuousBackendUpdate = millis();
    }

    if (fingerLossDetected)
    {
      stopContinuousAcquisitionTask();
      measurementRunning = false;

      if (i2cMutex != nullptr)
      {
        if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE)
        {
          maxSensor.clearFIFO();
          xSemaphoreGive(i2cMutex);
        }
      }
      else
      {
        maxSensor.clearFIFO();
      }

      fingerDetected = false;
      stableFingerDetected = false;
      fingerLossDetected = false;
      fingerMissingStart = 0;

      sendSensorStatus(
        "FINGER_REMOVED",
        "Please place your finger back on the sensor and hold still.",
        -1
      );

      Serial.println("Waiting for a stable finger before resuming live optical monitoring.");

      waitForStableFinger();

      if (!continuousMonitoring || !monitoringActive)
        break;

      resetContinuousProcessingState();
      measurementRunning = true;
      stableFingerDetected = true;

      if (i2cMutex != nullptr)
      {
        if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE)
        {
          maxSensor.clearFIFO();
          xSemaphoreGive(i2cMutex);
        }
      }
      else
      {
        maxSensor.clearFIFO();
      }

      if (temperatureSensorPresent)
        startTemperatureConversion();

      startContinuousAcquisitionTask();

      sendSensorStatus(
        "MEASURING",
        "Finger restored. Continuous live monitoring resumed.",
        -1
      );

      if (motionTaskHandle == nullptr)
        startContinuousMotionTask();
    }

    delay(5);
  }

continuous_cleanup:

  stopContinuousAcquisitionTask();
  stopContinuousMotionTask();

  measurementRunning = false;
  continuousMonitoring = false;
  monitoringActive = false;

  stopSensorMeasurement();

  sendSensorStatus(
    "SESSION_STOPPED",
    "Continuous monitoring stopped.",
    0
  );

  notifyMonitoringComplete();

  Serial.println();
  Serial.println("================================================");
  Serial.println("      CONTINUOUS MONITORING STOPPED");
  Serial.println("================================================");
  Serial.println();
}


// ============================================================
// SETUP
// ============================================================

void setup()
{
  Serial.begin(115200);

  // Shared I2C bus protection for the Continuous MAX30102 task and
  // the main-task MPU6050 access.
  i2cMutex = xSemaphoreCreateMutex();

  if (i2cMutex == nullptr)
  {
    Serial.println("ERROR: Unable to create I2C mutex.");
  }

  delay(1000);


  Serial.println();

  Serial.println(
    "================================================"
  );

  Serial.println(
    "          MEDJARVIS ESP32 STARTING"
  );

  Serial.println(
    "================================================"
  );

  Serial.println();


  // ----------------------------------------------------------
  // I2C
  // ----------------------------------------------------------

  Wire.begin(
    SDA_PIN,
    SCL_PIN
  );


  // ----------------------------------------------------------
  // WIFI
  // ----------------------------------------------------------

  connectWiFi();


  // ----------------------------------------------------------
  // MAX30102
  // ----------------------------------------------------------

  Serial.println(
    "Initializing MAX30102..."
  );


  if (
    !maxSensor.begin(
      Wire,
      I2C_SPEED_FAST
    )
  )
  {
    maxSensorPresent = false;
    Serial.println(
      "ERROR: MAX30102 not detected!"
    );
  }
  else
  {
    maxSensorPresent = true;
    Serial.println(
      "MAX30102 detected."
    );


    maxSensor.setup(
      MAX_LED_BRIGHTNESS,
      MAX_SAMPLE_AVERAGE,
      MAX_LED_MODE,
      MAX_SAMPLE_RATE,
      MAX_PULSE_WIDTH,
      MAX_ADC_RANGE
    );


    maxSensor.setPulseAmplitudeRed(
      MAX_LED_BRIGHTNESS
    );

    maxSensor.setPulseAmplitudeIR(
      MAX_LED_BRIGHTNESS
    );

    maxSensor.clearFIFO();


    Serial.println(
      "MAX30102 configured."
    );
  }


  // ----------------------------------------------------------
  // MPU6050
  // ----------------------------------------------------------

  Serial.println(
    "Initializing MPU6050..."
  );


  if (
    !mpu.begin()
  )
  {
    mpuSensorPresent = false;
    Serial.println(
      "ERROR: MPU6050 not detected!"
    );
  }
  else
  {
    mpuSensorPresent = true;
    Serial.println(
      "MPU6050 detected."
    );


    mpu.setAccelerometerRange(
      MPU6050_RANGE_8_G
    );

    mpu.setGyroRange(
      MPU6050_RANGE_500_DEG
    );

    mpu.setFilterBandwidth(
      MPU6050_BAND_21_HZ
    );


    Serial.println(
      "MPU6050 configured."
    );
  }


  // ----------------------------------------------------------
  // DS18B20
  // ----------------------------------------------------------

  Serial.println(
    "Initializing DS18B20..."
  );


  ds18b20.begin();
  ds18b20.setWaitForConversion(false);


  int deviceCount =
    ds18b20.getDeviceCount();


  if (
    deviceCount > 0
  )
  {
    temperatureSensorPresent = true;

    ds18b20.setResolution(
      TEMPERATURE_RESOLUTION
    );

    Serial.print(
      "DS18B20 detected. Devices: "
    );

    Serial.println(
      deviceCount
    );
  }
  else
  {
    temperatureSensorPresent = false;

    Serial.println(
      "DS18B20 not detected."
    );
  }


  // ----------------------------------------------------------
  // INITIAL STATE
  // ----------------------------------------------------------

  resetMeasurementData();

  resetSensorStatusState();


  continuousMonitoring = false;

  monitoringActive = false;

  measurementRunning = false;

  fallEventDetected = false;
  fallEventConfidence = 0.0;
  fallState = 0;

  spotAwaitingFreshStart = false;

  CURRENT_MODE = SPOT_MODE;


  // ----------------------------------------------------------
  // TURN MAX30102 LEDs OFF UNTIL A MEASUREMENT IS STARTED.
  // ----------------------------------------------------------

  maxSensor.setPulseAmplitudeRed(0);

  maxSensor.setPulseAmplitudeIR(0);

  maxSensor.setPulseAmplitudeGreen(0);


  Serial.println();

  Serial.println(
    "================================================"
  );

  Serial.println(
    "          MEDJARVIS ESP32 READY"
  );

  Serial.println(
    "================================================"
  );

  Serial.println(
    "Band ID: BAND-MJ-001"
  );

  Serial.println(
    "Initial state: IDLE"
  );

  Serial.println(
    "Waiting for MedJarvis START command..."
  );

  Serial.println();
}


// ============================================================
// MAIN LOOP
// ============================================================

void loop()
{
  // ----------------------------------------------------------
  // If no measurement is currently running, ask the backend
  // whether the frontend has requested START/STOP.
  // ----------------------------------------------------------

  if (
    !measurementRunning &&
    !continuousMonitoring
  )
  {
    checkMonitoringCommand();
  }


  // ----------------------------------------------------------
  // CONTINUOUS MODE
  // ----------------------------------------------------------

  if (
    monitoringActive &&
    CURRENT_MODE == CONTINUOUS_MODE &&
    continuousMonitoring
  )
  {
    runContinuousMonitoring();

    return;
  }


  // ----------------------------------------------------------
  // SPOT MODE
  // ----------------------------------------------------------

  if (
    monitoringActive &&
    CURRENT_MODE == SPOT_MODE &&
    !continuousMonitoring
  )
  {
    waitForStableFinger();


    if (
      monitoringActive &&
      CURRENT_MODE == SPOT_MODE
    )
    {
      runSpotMeasurement();
    }

    return;
  }


  // ----------------------------------------------------------
  // IDLE
  // ----------------------------------------------------------

  delay(100);
}


// ============================================================
// WIFI CONNECTION
// ============================================================

void connectWiFi()
{
  Serial.println();

  Serial.print(
    "Connecting to WiFi"
  );

  WiFi.mode(WIFI_STA);

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );


  unsigned long startTime =
    millis();


  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startTime < 15000UL
  )
  {
    delay(500);

    Serial.print(".");
  }


  Serial.println();


  if (
    WiFi.status() == WL_CONNECTED
  )
  {
    Serial.println(
      "WiFi connected."
    );

    Serial.print(
      "ESP32 IP: "
    );

    Serial.println(
      WiFi.localIP()
    );
  }
  else
  {
    Serial.println(
      "WARNING: WiFi connection failed."
    );
  }
}


// ============================================================
// RESET MEASUREMENT DATA
// ============================================================

void resetMeasurementData()
{
  measurementRunning = false;

  fingerDetected = false;

  stableFingerDetected = false;

  fingerLossDetected = false;
  fingerMissingStart = 0;


  measurementStartTime = 0;

  measurementEndTime = 0;

  fingerStableStart = 0;


  maxSampleCount = 0;
  sampleRateWindowStart = millis();
  sampleRateWindowCount = 0;


  currentIR = 0;

  currentRed = 0;


  finalSpO2 = 0;

  latestValidatedSpO2 = 0;
  latestValidatedHeartRate = 0;
  latestSpO2Update = 0;
  latestHeartRateUpdate = 0;

  continuousSpO2Confidence = 0.0;
  continuousHRConfidence = 0.0;
  continuousHRVConfidence = 0.0;
  continuousMeasurementConfidence = 0.0;

  portENTER_CRITICAL(&ppgMux);
  ppgWaveformIndex = 0;
  ppgWaveformCount = 0;
  ppgSampleSequence = 0;
  ppgBeatSequenceCount = 0;

  for (int i = 0; i < PPG_WAVEFORM_SIZE; i++)
  {
    ppgWaveform[i] = 0;
  }

  for (int i = 0; i < PPG_BEAT_HISTORY_SIZE; i++)
  {
    ppgBeatSequence[i] = 0;
  }
  portEXIT_CRITICAL(&ppgMux);

  spo2BufferIndex = 0;

  totalValidSpO2Samples = 0;

  totalSpO2Windows = 0;

  validSpO2Windows = 0;

  spo2Sum = 0.0;

  algorithmHRSum = 0.0;

  validAlgorithmHRWindows = 0;


  rateSpot = 0;

  validRateCount = 0;

  lastBeat = 0;

  currentBPM = 0.0;

  averageBPM = 0;

  medianBPM = 0;

  hrValidationCount = 0;
  spo2ValidationCount = 0;
  algorithmHRValidationCount = 0;

  for (int i = 0; i < PHYSIO_VALIDATION_SIZE; i++)
  {
    hrValidationValues[i] = 0;
    spo2ValidationValues[i] = 0;
    algorithmHRValidationValues[i] = 0;
  }


  rrSpot = 0;

  rrCount = 0;

  hrvSDNN = 0.0;
  validRRForHRV = 0;

  hrvBaseline = 0.0;
  hrvSmoothedAC = 0.0;
  hrvPreviousAC = 0.0;
  hrvPreviousPreviousAC = 0.0;
  hrvAmplitude = 0.0;
  hrvLastPeakTime = 0;
  hrvDetectorInitialized = false;

  spotSpO2Count = 0;
  spotHRCount = 0;
  spotRRCount = 0;
  spotSpO2Confidence = 0.0;
  spotHRConfidence = 0.0;
  spotHRVConfidence = 0.0;
  measurementConfidence = 0.0;
  continuousSpO2Confidence = 0.0;
  continuousHRConfidence = 0.0;
  continuousHRVConfidence = 0.0;
  continuousMeasurementConfidence = 0.0;

  for (uint16_t i = 0; i < SPOT_AGGREGATION_SIZE; i++)
  {
    spotSpO2Values[i] = 0;
    spotHRValues[i] = 0;
    spotRRValues[i] = 0;
  }


  accelX = 0.0;

  accelY = 0.0;

  accelZ = 0.0;

  gyroX = 0.0;

  gyroY = 0.0;

  gyroZ = 0.0;

  tiltAngle = 0.0;


  accelMagnitudeSum = 0.0;

  gyroMagnitudeSum = 0.0;

  tiltSum = 0.0;

  mpuSampleCount = 0;


  signalQuality = 0;
  temperatureReadingValid = false;
  temperatureConversionRunning = false;
  lastTemperatureRequest = 0;


  fallEventDetected = false;
  fallEventConfidence = 0.0;
  fallState = 0;
  fallCandidateTime = 0;
  fallImpactTime = 0;
  fallStillnessStart = 0;
  fallPreImpactTilt = 0.0;
  fallCandidatePeakAccel = 0.0;
  fallCandidatePeakGyro = 0.0;
  fallOrientationChanged = false;
  lastConfirmedFallTime = 0;


  for (
    int i = 0;
    i < RATE_SIZE;
    i++
  )
  {
    rates[i] = 0;
  }


  for (
    int i = 0;
    i < RR_BUFFER_SIZE;
    i++
  )
  {
    rrIntervals[i] = 0.0;
  }


  for (
    int i = 0;
    i < SPO2_WINDOW_SIZE;
    i++
  )
  {
    irBuffer[i] = 0;

    redBuffer[i] = 0;
  }
}
// ============================================================
// FINISH CALCULATIONS
// ============================================================

void finishMeasurementCalculations()
{
  calculateFinalSpO2();

  calculateHeartRateAverage();

  calculateMedianHeartRate();

  calculateHRV();

  calculateSignalQuality();

  spotHRVConfidence = calculateHRVConfidence();

  // Calculate the robust Spot HR before building the overall confidence.
  // This ensures spotHRConfidence is populated before measurementConfidence
  // is finalized.
  if (CURRENT_MODE == SPOT_MODE)
  {
    getRobustSpotHeartRate();
  }

  if (CURRENT_MODE == SPOT_MODE)
  {
    measurementConfidence =
      constrain(
        (spotSpO2Confidence * 0.40) +
        (spotHRConfidence * 0.40) +
        (spotHRVConfidence * 0.10) +
        ((float)signalQuality * 0.10),
        50.0,
         99.0
      );
  }
  else
  {
     measurementConfidence =
    continuousMeasurementConfidence;
  }

  if (
    mpuSampleCount > 0
  )
  {
    accelMagnitudeSum /=
      mpuSampleCount;

    gyroMagnitudeSum /=
      mpuSampleCount;

    tiltSum /=
      mpuSampleCount;
  }
}


// ============================================================
// SPOT MODE - 60 SECOND MEASUREMENT
// ============================================================
//
// Spot mode performs one protected 60-second sensor-only acquisition.
// No HTTP request or backend polling occurs while the MAX30102 is being
// acquired. Final processing and the single vitals POST happen afterwards.
// ============================================================

void runSpotMeasurement()
{
  resetMeasurementData();

  measurementRunning = true;
  stableFingerDetected = true;
  measurementStartTime = millis();

  Serial.println();
  Serial.println("================================================");
  Serial.println("       MEDJARVIS SPOT MEASUREMENT");
  Serial.println("================================================");
  Serial.println("Duration: 60 seconds");
  Serial.println("Emergency/fall detection: DISABLED");
  Serial.println("SpO2: overlapping 100-sample windows");
  Serial.println("HR: beat-to-beat validation");
  Serial.println("HRV: validated RR intervals");
  Serial.println();
  Serial.println("KEEP FINGER COMPLETELY STILL.");
  Serial.println();

  // This is the only network status call before the protected
  // acquisition begins. After this point, no HTTP is performed
  // until the 60-second sensor-only acquisition has finished.
  sendSensorStatus(
    "MEASURING",
    "Reading started. Keep your finger still.",
    60
  );

  if (i2cMutex != nullptr)
  {
    if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE)
    {
      maxSensor.clearFIFO();
      xSemaphoreGive(i2cMutex);
    }
  }
  else
  {
    maxSensor.clearFIFO();
  }

  if (temperatureSensorPresent)
    startTemperatureConversion();

  // The actual 60-second acquisition clock starts only after
  // all pre-acquisition network work has completed.
  measurementStartTime = millis();

  unsigned long lastMPUTime = millis();
  unsigned long lastTemperatureTime = millis();

  while (
    millis() - measurementStartTime < SPOT_DURATION &&
    monitoringActive
  )
  {
    unsigned long now = millis();

    // MAX30102 has priority. Do not insert network operations here.
    if (i2cMutex != nullptr)
    {
      if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(2)) == pdTRUE)
      {
        serviceMAX30102();
        xSemaphoreGive(i2cMutex);
      }
    }
    else
    {
      serviceMAX30102();
    }

    // MPU6050 approximately 20 Hz.
    if (now - lastMPUTime >= 50UL)
    {
      lastMPUTime = now;

      if (i2cMutex != nullptr)
      {
        if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(2)) == pdTRUE)
        {
          readMPU();
          xSemaphoreGive(i2cMutex);
        }
      }
      else
      {
        readMPU();
      }
    }

    // DS18B20 is serviced asynchronously and does not block the
    // optical acquisition for its conversion time.
    serviceTemperature();

    if (
      now - lastTemperatureTime >= TEMPERATURE_INTERVAL &&
      temperatureSensorPresent
    )
    {
      lastTemperatureTime = now;
      if (!temperatureConversionRunning)
        startTemperatureConversion();
    }

    // If the finger is continuously absent for the grace period,
    // do not mix pre-removal and post-removal optical samples.
    // The current Spot session is discarded rather than returning
    // a misleading 60-second result.
    if (fingerLossDetected)
    {
      measurementRunning = false;
      stableFingerDetected = false;
      fingerDetected = false;

      stopSensorMeasurement();

      sendSensorStatus(
        "FINGER_REMOVED",
        "Finger was removed during the 60-second reading. The reading was discarded; start a new Spot measurement.",
        -1
      );

      Serial.println(
        "Spot measurement discarded because the finger was removed during acquisition."
      );

      return;
    }

    // Small cooperative yield only; no HTTP is performed here.
    delay(1);
  }

  if (!monitoringActive)
  {
    measurementRunning = false;
    stableFingerDetected = false;
    fingerDetected = false;
    stopSensorMeasurement();
    return;
  }

  // ==========================================================
  // ACQUISITION FINISHED
  // ==========================================================
  //
  // Network access is allowed again only after the full 60 seconds.
  // ==========================================================

  measurementRunning = false;
  measurementEndTime = millis();

  // Finish any DS18B20 conversion that was already in progress.
  if (temperatureSensorPresent && temperatureConversionRunning)
  {
    unsigned long temperatureWaitStart = millis();

    while (
      temperatureConversionRunning &&
      millis() - temperatureWaitStart < 250UL
    )
    {
      serviceTemperature();
      delay(1);
    }

    // If the conversion still has not completed, read it only when
    // the non-blocking service has marked it complete.
    serviceTemperature();
  }

  // Confirm that the backend session is still active. This HTTP call
  // occurs after acquisition and therefore cannot starve MAX30102 FIFO.
  checkMonitoringCommand();

  if (!monitoringActive)
  {
    stableFingerDetected = false;
    fingerDetected = false;
    stopSensorMeasurement();

    Serial.println(
      "Spot measurement discarded because monitoring was stopped."
    );

    return;
  }

  // Final calculations use the complete 60-second candidate history.
  finishMeasurementCalculations();

  Serial.println();
  Serial.println("================================================");
  Serial.println("       SPOT MEASUREMENT COMPLETE");
  Serial.println("================================================");
  Serial.print("Actual sensor acquisition time: ");
  Serial.print(measurementEndTime - measurementStartTime);
  Serial.println(" ms");
  Serial.println("Final Spot values calculated.");

  printFinalResults();
  printFinalJSON();

  sendSensorStatus(
    "READING_COMPLETE",
    "60-second Spot reading complete. Sending final values.",
    0
  );

  // Exactly one final vitals POST for the Spot session.
  sendVitalsToBackend(true);

  stopSensorMeasurement();

  sendSensorStatus(
    "SESSION_COMPLETE",
    "Spot monitoring complete.",
    0
  );

  // Prevent the same still-active backend command from starting the
  // completed Spot session again. The guard is cleared only after
  // an inactive backend state is observed.
  spotAwaitingFreshStart = true;
  notifyMonitoringComplete();

  Serial.println();
  Serial.println("Spot result sent.");
}

// ============================================================
 // CONTINUOUS MAX30102 ACQUISITION TASK
 // ============================================================

void continuousMAX30102Task(void* parameter)
{
  (void)parameter;
  continuousAcquisitionTaskRunning = true;

  while (
    !continuousAcquisitionStopRequested &&
    continuousMonitoring &&
    monitoringActive
  )
  {
    if (i2cMutex != nullptr)
    {
      if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(20)) == pdTRUE)
      {
        serviceMAX30102();
        xSemaphoreGive(i2cMutex);
      }
    }
    else
    {
      serviceMAX30102();
    }

    vTaskDelay(pdMS_TO_TICKS(1));
  }

  continuousAcquisitionTaskRunning = false;
  max30102TaskHandle = nullptr;
  vTaskDelete(nullptr);
}


void startContinuousAcquisitionTask()
{
  if (max30102TaskHandle != nullptr)
  {
    return;
  }

  continuousAcquisitionStopRequested = false;

  BaseType_t result = xTaskCreate(
    continuousMAX30102Task,
    "MAX30102Live",
    4096,
    nullptr,
    3,
    &max30102TaskHandle
  );

  if (result != pdPASS)
  {
    max30102TaskHandle = nullptr;
    continuousAcquisitionTaskRunning = false;
    Serial.println("ERROR: Could not start MAX30102 continuous acquisition task.");
  }
}


void stopContinuousAcquisitionTask()
{
  continuousAcquisitionStopRequested = true;

  unsigned long waitStart = millis();

  while (
    continuousAcquisitionTaskRunning &&
    millis() - waitStart < 1000UL
  )
  {
    delay(5);
  }

  if (!continuousAcquisitionTaskRunning)
  {
    max30102TaskHandle = nullptr;
  }
}


void continuousMotionTask(void* parameter)
{
  (void)parameter;
  motionTaskRunning = true;

  unsigned long lastMotionSample = 0;

  while (
    !motionTaskStopRequested &&
    continuousMonitoring &&
    monitoringActive
  )
  {
    unsigned long now = millis();

    if (now - lastMotionSample >= 20UL)
    {
      if (i2cMutex != nullptr)
      {
        if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(20)) == pdTRUE)
        {
          if (mpuSensorPresent)
          {
            readMPU();
          }
          xSemaphoreGive(i2cMutex);
        }
      }
      else if (mpuSensorPresent)
      {
        readMPU();
      }

      // Temperature uses the OneWire bus, not the shared I2C bus.
      serviceTemperature();
      lastMotionSample = now;
    }

    vTaskDelay(pdMS_TO_TICKS(5));
  }

  motionTaskRunning = false;
  motionTaskHandle = nullptr;
  vTaskDelete(nullptr);
}


void startContinuousMotionTask()
{
  if (motionTaskHandle != nullptr)
  {
    return;
  }

  motionTaskStopRequested = false;

  BaseType_t result = xTaskCreate(
    continuousMotionTask,
    "MotionTempLive",
    4096,
    nullptr,
    2,
    &motionTaskHandle
  );

  if (result != pdPASS)
  {
    motionTaskHandle = nullptr;
    motionTaskRunning = false;
    Serial.println("ERROR: Could not start MPU6050/temperature task.");
  }
}


void stopContinuousMotionTask()
{
  motionTaskStopRequested = true;

  unsigned long waitStart = millis();

  while (
    motionTaskRunning &&
    millis() - waitStart < 1000UL
  )
  {
    delay(5);
  }

  if (!motionTaskRunning)
  {
    motionTaskHandle = nullptr;
  }
}


void resetContinuousProcessingState()
{
  // Clear only the current optical calculation state. Previously validated
  // dashboard values are intentionally retained until a new validated value
  // arrives.
  measurementRunning = false;
  fingerLossDetected = false;
  fingerMissingStart = 0;

  maxSampleCount = 0;
  sampleRateWindowStart = millis();
  sampleRateWindowCount = 0;
  totalValidSpO2Samples = 0;
  totalSpO2Windows = 0;
  validSpO2Windows = 0;

  spo2Sum = 0.0;
  algorithmHRSum = 0.0;
  validAlgorithmHRWindows = 0;

  spo2BufferIndex = 0;

  rateSpot = 0;
  validRateCount = 0;
  lastBeat = 0;
  currentBPM = 0.0;
  averageBPM = 0;
  medianBPM = 0;

  hrValidationCount = 0;
  spo2ValidationCount = 0;
  algorithmHRValidationCount = 0;

  for (int i = 0; i < PHYSIO_VALIDATION_SIZE; i++)
  {
    hrValidationValues[i] = 0;
    spo2ValidationValues[i] = 0;
    algorithmHRValidationValues[i] = 0;
  }

  rrSpot = 0;
  rrCount = 0;
  hrvSDNN = 0.0;
  validRRForHRV = 0;
  fallEventConfidence = 0.0;
  fallState = 0;
  fallCandidateTime = 0;
  fallImpactTime = 0;
  fallStillnessStart = 0;
  fallPreImpactTilt = 0.0;
  fallCandidatePeakAccel = 0.0;
  fallCandidatePeakGyro = 0.0;
  fallOrientationChanged = false;

  for (int i = 0; i < RATE_SIZE; i++)
  {
    rates[i] = 0;
  }

  for (int i = 0; i < RR_BUFFER_SIZE; i++)
  {
    rrIntervals[i] = 0.0;
  }

  for (int i = 0; i < SPO2_WINDOW_SIZE; i++)
  {
    irBuffer[i] = 0;
    redBuffer[i] = 0;
  }

  portENTER_CRITICAL(&ppgMux);
  ppgWaveformIndex = 0;
  ppgWaveformCount = 0;
  ppgSampleSequence = 0;
  ppgBeatSequenceCount = 0;

  for (int i = 0; i < PPG_WAVEFORM_SIZE; i++)
  {
    ppgWaveform[i] = 0;
  }

  for (int i = 0; i < PPG_BEAT_HISTORY_SIZE; i++)
  {
    ppgBeatSequence[i] = 0;
  }
  portEXIT_CRITICAL(&ppgMux);

  signalQuality = 0;

  // A new optical session must not inherit physiological values from the
  // previous finger/session. New HR/SpO2/HRV must be validated again.
  latestValidatedSpO2 = 0;
  latestValidatedHeartRate = 0;
  latestSpO2Update = 0;
  latestHeartRateUpdate = 0;
}


void appendPPGSample(uint32_t irValue)
{
  portENTER_CRITICAL(&ppgMux);

  ppgSampleSequence++;

  ppgWaveform[ppgWaveformIndex] = irValue;
  ppgWaveformIndex++;

  if (ppgWaveformIndex >= PPG_WAVEFORM_SIZE)
  {
    ppgWaveformIndex = 0;
  }

  if (ppgWaveformCount < PPG_WAVEFORM_SIZE)
  {
    ppgWaveformCount++;
  }

  portEXIT_CRITICAL(&ppgMux);
}


void recordPPGBeatEvent()
{
  portENTER_CRITICAL(&ppgMux);

  if (ppgSampleSequence > 0)
  {
    if (ppgBeatSequenceCount < PPG_BEAT_HISTORY_SIZE)
    {
      ppgBeatSequence[ppgBeatSequenceCount++] = ppgSampleSequence;
    }
    else
    {
      for (byte i = 1; i < PPG_BEAT_HISTORY_SIZE; i++)
      {
        ppgBeatSequence[i - 1] = ppgBeatSequence[i];
      }

      ppgBeatSequence[PPG_BEAT_HISTORY_SIZE - 1] = ppgSampleSequence;
    }
  }

  portEXIT_CRITICAL(&ppgMux);
}


// ============================================================
// SERVICE MAX30102
// ============================================================

void serviceMAX30102()
{
  if (!maxSensorPresent)
  {
    return;
  }

  maxSensor.check();

  while (maxSensor.available())
  {
    // Consume the oldest unread sample from the MAX30102 FIFO.
    // getIR()/getRed() return the newest sample and are not used here.
    uint32_t irValue = maxSensor.getFIFOIR();
    uint32_t redValue = maxSensor.getFIFORed();

    maxSensor.nextSample();

    processMAXSample(irValue, redValue);
  }
}


// ============================================================
// PROCESS MAX30102 SAMPLE
// ============================================================

void processMAXSample(
  uint32_t irValue,
  uint32_t redValue
)
{
  currentIR =
    (long)irValue;

  currentRed =
    (long)redValue;

  maxSampleCount++;
  sampleRateWindowCount++;

  if (
    sampleRateWindowStart > 0 &&
    millis() - sampleRateWindowStart >= 5000UL
  )
  {
    float measuredSampleRate =
      ((float)sampleRateWindowCount * 1000.0) /
      (float)(millis() - sampleRateWindowStart);

    Serial.print("MAX30102 processed sample rate: ");
    Serial.print(measuredSampleRate, 1);
    Serial.println(" samples/sec");

    sampleRateWindowStart = millis();
    sampleRateWindowCount = 0;
  }

  bool usable =
    (
      irValue >= FINGER_THRESHOLD &&
      irValue < MAX_VALID_IR
    );

  if (!usable)
  {
    fingerDetected = false;

    // During a protected measurement window, do not mix samples
    // from before and after finger removal. Give the optical signal
    // a short grace period for normal sample-to-sample noise.
    if (measurementRunning)
    {
      if (fingerMissingStart == 0)
      {
        fingerMissingStart = millis();
      }
      else if (millis() - fingerMissingStart >= FINGER_LOSS_GRACE_TIME)
      {
        fingerLossDetected = true;
        stableFingerDetected = false;
      }
    }

    return;
  }

  fingerDetected = true;
  fingerMissingStart = 0;

  totalValidSpO2Samples++;

  appendPPGSample(irValue);

  irBuffer[
    spo2BufferIndex
  ] =
    irValue;

  redBuffer[
    spo2BufferIndex
  ] =
    redValue;

  spo2BufferIndex++;

  if (
    spo2BufferIndex >=
    SPO2_WINDOW_SIZE
  )
  {
    processSpO2Window();
  }

  unsigned long sampleTime = millis();

  // Existing HR pipeline is intentionally unchanged.
  processHeartbeat(
    irValue,
    sampleTime
  );

  // Separate RR detector used only for HRV.
  processIndependentHRVBeat(
    irValue,
    sampleTime
  );
}


// ============================================================
// PROCESS ONE COMPLETE SPO2 WINDOW
// ============================================================

void processSpO2Window()
{
  totalSpO2Windows++;

  int32_t windowSpO2 = 0;
  int8_t windowValidSpO2 = 0;
  int32_t windowHR = 0;
  int8_t windowValidHR = 0;

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    SPO2_WINDOW_SIZE,
    redBuffer,
    &windowSpO2,
    &windowValidSpO2,
    &windowHR,
    &windowValidHR
  );

  // Window-level optical quality check. The Maxim algorithm's valid flag is
  // necessary but is not by itself sufficient for downstream confidence.
  double mean = 0.0;
  double minimum = (double)irBuffer[0];
  double maximum = (double)irBuffer[0];

  for (int i = 0; i < SPO2_WINDOW_SIZE; i++)
  {
    double v = (double)irBuffer[i];
    mean += v;
    if (v < minimum) minimum = v;
    if (v > maximum) maximum = v;
  }

  mean /= SPO2_WINDOW_SIZE;

  double variance = 0.0;
  for (int i = 0; i < SPO2_WINDOW_SIZE; i++)
  {
    double d = (double)irBuffer[i] - mean;
    variance += d * d;
  }

  variance /= SPO2_WINDOW_SIZE;

  double standardDeviation = sqrt(variance);
  double coefficientVariation = mean > 0.0 ? standardDeviation / mean : 1.0;
  double range = maximum - minimum;

  bool opticalWindowUsable =
    mean >= FINGER_THRESHOLD &&
    mean < MAX_VALID_IR &&
    range >= 100.0 &&
    coefficientVariation < 0.35;

  if (
    windowValidSpO2 &&
    windowSpO2 >= 70 &&
    windowSpO2 <= 100 &&
    opticalWindowUsable
  )
  {
    spo2Sum += (float)windowSpO2;
    validSpO2Windows++;
    recordSpO2Candidate(windowSpO2);

    if (CURRENT_MODE == CONTINUOUS_MODE)
      updateContinuousValidatedValues();
  }

  if (
    windowValidHR &&
    windowHR >= 40 &&
    windowHR <= 180 &&
    opticalWindowUsable
  )
  {
    algorithmHRSum += (float)windowHR;
    validAlgorithmHRWindows++;
    recordAlgorithmHeartRateCandidate((int)windowHR);

    if (CURRENT_MODE == CONTINUOUS_MODE)
      updateContinuousValidatedValues();
  }

  // Keep the newest 75 samples and fill 25 new samples for the next
  // overlapping 100-sample window, matching the MAX3010x reference pattern.
  for (int i = 0; i < SPO2_WINDOW_SIZE - 25; i++)
  {
    irBuffer[i] = irBuffer[i + 25];
    redBuffer[i] = redBuffer[i + 25];
  }

  for (int i = SPO2_WINDOW_SIZE - 25; i < SPO2_WINDOW_SIZE; i++)
  {
    irBuffer[i] = 0;
    redBuffer[i] = 0;
  }

  spo2BufferIndex = SPO2_WINDOW_SIZE - 25;
}


// ============================================================
// FINAL SPO2
// ============================================================


// ============================================================
// ROBUST PHYSIOLOGICAL AGGREGATION / CONFIDENCE
// ============================================================

float calculateSpO2Confidence()
{
  if (spotSpO2Count < MIN_VALID_SPO2_WINDOWS)
    return 0.0;

  int* values = aggregationScratch;

  for (uint16_t i = 0; i < spotSpO2Count; i++)
    values[i] = spotSpO2Values[i];

  for (uint16_t i = 0; i < spotSpO2Count; i++)
    for (uint16_t j = i + 1; j < spotSpO2Count; j++)
      if (values[j] < values[i])
      {
        int t = values[i];
        values[i] = values[j];
        values[j] = t;
      }

  int median = values[spotSpO2Count / 2];
  for (uint16_t i = 0; i < spotSpO2Count; i++)
    values[i] = abs(values[i] - median);

  for (uint16_t i = 0; i < spotSpO2Count; i++)
    for (uint16_t j = i + 1; j < spotSpO2Count; j++)
      if (values[j] < values[i])
      {
        int t = values[i];
        values[i] = values[j];
        values[j] = t;
      }

  int tolerance = max(2, values[spotSpO2Count / 2] * 3);

  // Re-copy source values for the inlier pass.
  uint16_t inliers = 0;
  long totalDeviation = 0;

  for (uint16_t i = 0; i < spotSpO2Count; i++)
  {
    int deviation = abs((int)spotSpO2Values[i] - median);
    if (deviation <= tolerance)
    {
      inliers++;
      totalDeviation += deviation;
    }
  }

  float agreement =
    constrain(
      ((float)inliers / (float)spotSpO2Count) * 100.0,
      0.0,
      100.0
    );

  float consistency =
    inliers > 0
      ? constrain(
          100.0 -
          ((float)totalDeviation / (float)inliers) * 12.0,
          0.0,
          100.0
        )
      : 0.0;

  float sampleSupport =
    constrain(
      ((float)spotSpO2Count / 20.0) * 100.0,
      0.0,
      100.0
    );

  return constrain(
    agreement * 0.45 +
    consistency * 0.35 +
    sampleSupport * 0.20,
    50.0,
    99.0
  );
}

float calculateHeartRateConfidence()
{
  if (spotHRCount < MIN_VALID_HR_SAMPLES)
    return 0.0;

  int* values = aggregationScratch;

  for (uint16_t i = 0; i < spotHRCount; i++)
    values[i] = spotHRValues[i];

  for (uint16_t i = 0; i < spotHRCount; i++)
    for (uint16_t j = i + 1; j < spotHRCount; j++)
      if (values[j] < values[i])
      {
        int t = values[i];
        values[i] = values[j];
        values[j] = t;
      }

  int median = values[spotHRCount / 2];

  for (uint16_t i = 0; i < spotHRCount; i++)
    values[i] = abs(values[i] - median);

  for (uint16_t i = 0; i < spotHRCount; i++)
    for (uint16_t j = i + 1; j < spotHRCount; j++)
      if (values[j] < values[i])
      {
        int t = values[i];
        values[i] = values[j];
        values[j] = t;
      }

  int tolerance = max(6, values[spotHRCount / 2] * 3);
  uint16_t inliers = 0;
  long totalDeviation = 0;

  for (uint16_t i = 0; i < spotHRCount; i++)
  {
    int deviation = abs((int)spotHRValues[i] - median);
    if (deviation <= tolerance)
    {
      inliers++;
      totalDeviation += deviation;
    }
  }

  float agreement =
    constrain(
      ((float)inliers / (float)spotHRCount) * 100.0,
      0.0,
      100.0
    );

  float consistency =
    inliers > 0
      ? constrain(
          100.0 -
          ((float)totalDeviation / (float)inliers) * 2.0,
          0.0,
          100.0
        )
      : 0.0;

  float sampleSupport =
    constrain(
      ((float)spotHRCount / 20.0) * 100.0,
      0.0,
      100.0
    );

  return constrain(
    agreement * 0.45 +
    consistency * 0.35 +
    sampleSupport * 0.20,
    50.0,
    99.0
  );
}

float calculateHRVConfidence()
{
  if (validRRForHRV < 4)
    return 0.0;

  float support =
    constrain(
      ((float)validRRForHRV / 30.0) * 100.0,
      0.0,
      100.0
    );

  return constrain(
    55.0 + support * 0.40,
    0.0,
    95.0
  );
}

int getRobustSpotSpO2()
{
  if (spotSpO2Count < MIN_VALID_SPO2_WINDOWS)
  {
    spotSpO2Confidence = 0.0;
    return 0;
  }

  int* values = aggregationScratch;

  for (uint16_t i = 0; i < spotSpO2Count; i++)
    values[i] = spotSpO2Values[i];

  for (uint16_t i = 0; i < spotSpO2Count; i++)
    for (uint16_t j = i + 1; j < spotSpO2Count; j++)
      if (values[j] < values[i])
      {
        int t = values[i];
        values[i] = values[j];
        values[j] = t;
      }

  int median = values[spotSpO2Count / 2];

  for (uint16_t i = 0; i < spotSpO2Count; i++)
    values[i] = abs(values[i] - median);

  for (uint16_t i = 0; i < spotSpO2Count; i++)
    for (uint16_t j = i + 1; j < spotSpO2Count; j++)
      if (values[j] < values[i])
      {
        int t = values[i];
        values[i] = values[j];
        values[j] = t;
      }

  int tolerance = max(2, values[spotSpO2Count / 2] * 3);
  uint16_t inlierCount = 0;
  long sum = 0;

  for (uint16_t i = 0; i < spotSpO2Count; i++)
  {
    if (abs((int)spotSpO2Values[i] - median) <= tolerance)
    {
      inlierCount++;
      sum += spotSpO2Values[i];
    }
  }

  int result =
    inlierCount >= MIN_VALID_SPO2_WINDOWS
      ? (int)round((double)sum / (double)inlierCount)
      : median;

  spotSpO2Confidence = calculateSpO2Confidence();

  return constrain(result, 70, 100);
}

int getRobustSpotHeartRate()
{
  // PRIMARY SOURCE: beat-to-beat MAX30102 detection.
  // This is the preferred Spot HR because it is the same source used
  // for RR intervals and HRV.
  if (spotHRCount >= MIN_VALID_HR_SAMPLES)
  {
    int* values = aggregationScratch;

    for (uint16_t i = 0; i < spotHRCount; i++)
      values[i] = spotHRValues[i];

    for (uint16_t i = 0; i < spotHRCount; i++)
      for (uint16_t j = i + 1; j < spotHRCount; j++)
        if (values[j] < values[i])
        {
          int t = values[i];
          values[i] = values[j];
          values[j] = t;
        }

    int median = values[spotHRCount / 2];

    for (uint16_t i = 0; i < spotHRCount; i++)
      values[i] = abs(values[i] - median);

    for (uint16_t i = 0; i < spotHRCount; i++)
      for (uint16_t j = i + 1; j < spotHRCount; j++)
        if (values[j] < values[i])
        {
          int t = values[i];
          values[i] = values[j];
          values[j] = t;
        }

    int tolerance = max(6, values[spotHRCount / 2] * 3);
    uint16_t inlierCount = 0;
    long sum = 0;

    for (uint16_t i = 0; i < spotHRCount; i++)
    {
      if (abs((int)spotHRValues[i] - median) <= tolerance)
      {
        inlierCount++;
        sum += spotHRValues[i];
      }
    }

    int result =
      inlierCount >= MIN_VALID_HR_SAMPLES
        ? (int)round((double)sum / (double)inlierCount)
        : median;

    spotHRConfidence = calculateHeartRateConfidence();
    return constrain(result, 40, 180);
  }

  // FALLBACK SOURCE: the Maxim SpO2 algorithm also returns a validated
  // heart-rate estimate for each usable 100-sample PPG window. The old
  // Spot implementation collected these values but never used them for
  // the final Spot HR. That is why Spot could finish with HR = null even
  // while Continuous mode was producing HR from the same sensor.
  if (algorithmHRValidationCount >= MIN_VALID_HR_SAMPLES)
  {
    int* values = aggregationScratch;

    for (byte i = 0; i < algorithmHRValidationCount; i++)
      values[i] = algorithmHRValidationValues[i];

    for (byte i = 0; i < algorithmHRValidationCount; i++)
      for (byte j = i + 1; j < algorithmHRValidationCount; j++)
        if (values[j] < values[i])
        {
          int t = values[i];
          values[i] = values[j];
          values[j] = t;
        }

    int median = values[algorithmHRValidationCount / 2];
    int result = median;

    // Average the central validated algorithm values rather than exposing
    // one arbitrary 100-sample window. This is the requested Spot behaviour:
    // collect many values silently, then expose one final result.
    long sum = 0;
    byte centralCount = algorithmHRValidationCount < 12
      ? algorithmHRValidationCount
      : 12;
    byte start = (algorithmHRValidationCount - centralCount) / 2;

    for (byte i = 0; i < centralCount; i++)
      sum += values[start + i];

    result = (int)round((double)sum / (double)centralCount);

    float spread =
      (float)(values[algorithmHRValidationCount - 1] - values[0]);

    float agreement =
      constrain(100.0 - spread * 1.5, 50.0, 99.0);

    float support =
      constrain(
        ((float)algorithmHRValidationCount / 20.0) * 100.0,
        0.0,
        100.0
      );

    spotHRConfidence =
      constrain(agreement * 0.70 + support * 0.30, 50.0, 99.0);

    return constrain(result, 40, 180);
  }

  // Last valid algorithm window. This is still a real sensor-derived HR;
  // it is only used when fewer than five validated windows survived the
  // quality gate. Never invent a physiological number.
  if (validAlgorithmHRWindows > 0)
  {
    float average =
      algorithmHRSum / (float)validAlgorithmHRWindows;

    spotHRConfidence = 50.0;

    return constrain((int)round(average), 40, 180);
  }

  spotHRConfidence = 0.0;
  return 0;
}

void recordSpotRR(uint16_t rrMs)
{
  if (rrMs < 333 || rrMs > 1500)
    return;

  if (spotRRCount < SPOT_AGGREGATION_SIZE)
    spotRRValues[spotRRCount++] = rrMs;
}

void updateContinuousValidatedValues()
{
  // Internal values refine as new valid sensor evidence arrives.
  // Backend transmission is throttled separately to about every 15 seconds.
  if (
    millis() - continuousSessionStart <
    CONTINUOUS_PHYSIO_WARMUP
  )
  {
    return;
  }

  bool hasValidSpO2 =
    spo2ValidationCount >= MIN_VALID_SPO2_WINDOWS;

  bool hasDirectHR =
    hrValidationCount >= MIN_VALID_HR_SAMPLES;

  bool hasAlgorithmHR =
    algorithmHRValidationCount >= MIN_VALID_HR_SAMPLES &&
    algorithmHeartRateCandidateStable();

  bool hasValidHR =
    hasDirectHR ||
    hasAlgorithmHR;

  if (hasValidSpO2)
  {
    int values[PHYSIO_VALIDATION_SIZE];

    for (byte i = 0; i < spo2ValidationCount; i++)
      values[i] = spo2ValidationValues[i];

    for (byte i = 0; i < spo2ValidationCount; i++)
    {
      for (byte j = i + 1; j < spo2ValidationCount; j++)
      {
        if (values[j] < values[i])
        {
          int t = values[i];
          values[i] = values[j];
          values[j] = t;
        }
      }
    }

    latestValidatedSpO2 =
      constrain(
        values[spo2ValidationCount / 2],
        70,
        100
      );

    latestSpO2Update = millis();

    int minValue = values[0];
    int maxValue = values[spo2ValidationCount - 1];

    float spread =
      (float)(maxValue - minValue);

    float agreement =
      constrain(
        100.0 - (spread * 12.0),
        50.0,
        99.0
      );

    float support =
      constrain(
        ((float)spo2ValidationCount / 20.0) * 100.0,
        0.0,
        100.0
      );

    continuousSpO2Confidence =
      constrain(
        agreement * 0.70 +
        support * 0.30,
        50.0,
        99.0
      );
  }
  else
  {
    continuousSpO2Confidence = 0.0;
  }

if (hasDirectHR)
  {
    int values[PHYSIO_VALIDATION_SIZE];

    for (byte i = 0; i < hrValidationCount; i++)
      values[i] = hrValidationValues[i];

    for (byte i = 0; i < hrValidationCount; i++)
    {
      for (byte j = i + 1; j < hrValidationCount; j++)
      {
        if (values[j] < values[i])
        {
          int t = values[i];
          values[i] = values[j];
          values[j] = t;
        }
      }
    }

    latestValidatedHeartRate =
      constrain(
        values[hrValidationCount / 2],
        40,
        180
      );

    latestHeartRateUpdate = millis();

    int minValue = values[0];
    int maxValue = values[hrValidationCount - 1];

    float spread =
      (float)(maxValue - minValue);

    float agreement =
      constrain(
        100.0 - (spread * 1.5),
        50.0,
        99.0
      );

    float support =
      constrain(
        ((float)hrValidationCount / 20.0) * 100.0,
        0.0,
        100.0
      );

    continuousHRConfidence =
      constrain(
        agreement * 0.70 +
        support * 0.30,
        50.0,
        99.0
      );
  }
else if (hasAlgorithmHR)
  {
    // Fallback only when the direct beat detector has not produced
    // enough stable candidates. The Maxim window-HR values are still
    // real validated sensor output and must be independently stable
    // before they become the Continuous dashboard HR.
    int values[PHYSIO_VALIDATION_SIZE];

    for (byte i = 0; i < algorithmHRValidationCount; i++)
      values[i] = algorithmHRValidationValues[i];

    for (byte i = 0; i < algorithmHRValidationCount; i++)
    {
      for (byte j = i + 1; j < algorithmHRValidationCount; j++)
      {
        if (values[j] < values[i])
        {
          int t = values[i];
          values[i] = values[j];
          values[j] = t;
        }
      }
    }

    latestValidatedHeartRate =
      constrain(
        values[algorithmHRValidationCount / 2],
        40,
        180
      );

    latestHeartRateUpdate = millis();

    int minValue = values[0];
    int maxValue = values[algorithmHRValidationCount - 1];

    float spread =
      (float)(maxValue - minValue);

    float agreement =
      constrain(
        100.0 - (spread * 1.5),
        50.0,
        99.0
      );

    float support =
      constrain(
        ((float)algorithmHRValidationCount / 20.0) * 100.0,
        0.0,
        100.0
      );

    continuousHRConfidence =
      constrain(
        agreement * 0.70 +
        support * 0.30,
        50.0,
        99.0
      );
  }
  else
  {
    continuousHRConfidence = 0.0;
  }

  if (
    hrvSDNN > 0.0 &&
    validRRForHRV >= 4
  )
  {
    continuousHRVConfidence =
      constrain(
        55.0 +
        ((float)validRRForHRV / 30.0) * 40.0,
        50.0,
        95.0
      );
  }
  else
  {
    continuousHRVConfidence = 0.0;
  }

  float confidenceSum = 0.0;
  byte confidenceCount = 0;

  if (continuousSpO2Confidence > 0.0)
  {
    confidenceSum += continuousSpO2Confidence;
    confidenceCount++;
  }

  if (continuousHRConfidence > 0.0)
  {
    confidenceSum += continuousHRConfidence;
    confidenceCount++;
  }

  if (continuousHRVConfidence > 0.0)
  {
    confidenceSum += continuousHRVConfidence;
    confidenceCount++;
  }

  if (confidenceCount > 0)
  {
    continuousMeasurementConfidence =
      constrain(
        confidenceSum / confidenceCount,
        50.0,
        99.0
      );
  }
  else
  {
    continuousMeasurementConfidence = 0.0;
  }
}

void calculateFinalSpO2()
{
  finalSpO2 = getRobustSpotSpO2();

  if (finalSpO2 < 70 || finalSpO2 > 100)
    finalSpO2 = 0;
}


// ============================================================
// INDEPENDENT HRV BEAT DETECTION
// ============================================================

void processIndependentHRVBeat(
  uint32_t irValue,
  unsigned long sampleTime
)
{
  // Remove the slow DC component so the detector works with the
  // pulsatile part of the MAX30102 signal.
  if (!hrvDetectorInitialized)
  {
    hrvBaseline = (float)irValue;
    hrvSmoothedAC = 0.0;
    hrvPreviousAC = 0.0;
    hrvPreviousPreviousAC = 0.0;
    hrvAmplitude = 0.0;
    hrvLastPeakTime = 0;
    hrvDetectorInitialized = true;
    return;
  }

  hrvBaseline =
    (hrvBaseline * (1.0 - HRV_BASELINE_ALPHA)) +
    ((float)irValue * HRV_BASELINE_ALPHA);

  float ac =
    (float)irValue -
    hrvBaseline;

  hrvSmoothedAC =
    (hrvSmoothedAC * (1.0 - HRV_SMOOTH_ALPHA)) +
    (ac * HRV_SMOOTH_ALPHA);

  float absoluteAC = fabs(hrvSmoothedAC);

  hrvAmplitude =
    (hrvAmplitude * (1.0 - HRV_AMPLITUDE_ALPHA)) +
    (absoluteAC * HRV_AMPLITUDE_ALPHA);

  // Adaptive threshold: never below a small absolute level, but scales
  // with the actual pulse amplitude of this sensor/finger placement.
  float peakThreshold =
    max(
      HRV_MIN_PEAK_THRESHOLD,
      hrvAmplitude * HRV_PEAK_FRACTION
    );

  // A local maximum in the smoothed AC waveform is treated as a
  // candidate pulse peak. The previous sample is used as the peak
  // timestamp because it is the local maximum being confirmed now.
  bool localPeak =
    hrvPreviousAC > hrvPreviousPreviousAC &&
    hrvPreviousAC >= hrvSmoothedAC &&
    hrvPreviousAC > peakThreshold;

  if (localPeak)
  {
    unsigned long peakTime =
      sampleTime >= 10UL
        ? sampleTime - 10UL
        : sampleTime;

    bool outsideRefractory =
      hrvLastPeakTime == 0 ||
      peakTime - hrvLastPeakTime >= HRV_REFRACTORY_MS;

    if (outsideRefractory)
    {
      if (hrvLastPeakTime != 0)
      {
        unsigned long delta =
          peakTime - hrvLastPeakTime;

        if (delta >= 333UL && delta <= 1500UL)
        {
          if (CURRENT_MODE == SPOT_MODE)
          {
            recordSpotRR((uint16_t)delta);
          }
          else if (CURRENT_MODE == CONTINUOUS_MODE)
          {
            // Continuous HRV uses the shared rolling RR buffer. The
            // previous implementation sent these intervals only to the
            // Spot aggregation buffer, leaving Continuous HRV empty when
            // the independent HRV detector was the only valid beat path.
            rrIntervals[rrSpot] = (float)delta;
            rrSpot++;

            if (rrSpot >= RR_BUFFER_SIZE)
              rrSpot = 0;

            if (rrCount < RR_BUFFER_SIZE)
              rrCount++;
          }

          calculateHRV();

          if (CURRENT_MODE == CONTINUOUS_MODE)
            updateContinuousValidatedValues();
        }
      }

      hrvLastPeakTime = peakTime;
    }
  }

  hrvPreviousPreviousAC = hrvPreviousAC;
  hrvPreviousAC = hrvSmoothedAC;
}


// ============================================================
// HEARTBEAT PROCESSING
// ============================================================

void processHeartbeat(
  uint32_t irValue,
  unsigned long sampleTime
)
{
  if (!checkForBeat(irValue))
    return;

  unsigned long beatTime = sampleTime;

  if (lastBeat == 0)
  {
    lastBeat = beatTime;
    return;
  }

  unsigned long delta = beatTime - lastBeat;

  // 40-180 BPM operating range. Do not advance lastBeat for a rejected beat.
  if (delta < 333 || delta > 1500)
    return;

  float calculatedBPM = 60000.0 / (float)delta;

  if (calculatedBPM < 40.0 || calculatedBPM > 180.0)
    return;

  lastBeat = beatTime;
  currentBPM = calculatedBPM;

  // This is the existing validated beat event. Record only this event for
  // the live PPG UI; raw waveform fluctuations are never marked as beats.
  recordPPGBeatEvent();

  rates[rateSpot] = (byte)round(calculatedBPM);
  rateSpot++;

  if (rateSpot >= RATE_SIZE)
    rateSpot = 0;

  if (validRateCount < RATE_SIZE)
    validRateCount++;

  recordHeartRateCandidate((int)round(calculatedBPM));

  rrIntervals[rrSpot] = (float)delta;
  rrSpot++;

  if (rrSpot >= RR_BUFFER_SIZE)
    rrSpot = 0;

  if (rrCount < RR_BUFFER_SIZE)
    rrCount++;

  if (CURRENT_MODE == SPOT_MODE)
    recordSpotRR((uint16_t)delta);

  calculateHeartRateAverage();
  calculateMedianHeartRate();
  calculateHRV();

  if (CURRENT_MODE == CONTINUOUS_MODE)
    updateContinuousValidatedValues();
}


// ============================================================
// PHYSIOLOGICAL VALUE VALIDATION
// ============================================================

void recordHeartRateCandidate(int bpm)
{
  if (bpm < 40 || bpm > 180)
    return;

  if (hrValidationCount < PHYSIO_VALIDATION_SIZE)
    hrValidationValues[hrValidationCount++] = bpm;
  else
  {
    for (byte i = 1; i < PHYSIO_VALIDATION_SIZE; i++)
      hrValidationValues[i - 1] = hrValidationValues[i];

    hrValidationValues[PHYSIO_VALIDATION_SIZE - 1] = bpm;
  }

  if (CURRENT_MODE == SPOT_MODE && spotHRCount < SPOT_AGGREGATION_SIZE)
    spotHRValues[spotHRCount++] = (int16_t)bpm;
}

bool heartRateCandidateStable()
{
  if (hrValidationCount < MIN_VALID_HR_SAMPLES)
  {
    return false;
  }

  int minValue = hrValidationValues[0];
  int maxValue = hrValidationValues[0];
  float sum = hrValidationValues[0];

  for (byte i = 1; i < hrValidationCount; i++)
  {
    if (hrValidationValues[i] < minValue)
    {
      minValue = hrValidationValues[i];
    }

    if (hrValidationValues[i] > maxValue)
    {
      maxValue = hrValidationValues[i];
    }

    sum += hrValidationValues[i];
  }

  float mean = sum / hrValidationCount;

  if (mean <= 0.0)
  {
    return false;
  }

  if (
    (float)(maxValue - minValue) >
    mean * HR_STABILITY_PERCENT
  )
  {
    return false;
  }

  return true;
}

void recordSpO2Candidate(int spo2)
{
  if (spo2 < 70 || spo2 > 100)
    return;

  if (spo2ValidationCount < PHYSIO_VALIDATION_SIZE)
    spo2ValidationValues[spo2ValidationCount++] = spo2;
  else
  {
    for (byte i = 1; i < PHYSIO_VALIDATION_SIZE; i++)
      spo2ValidationValues[i - 1] = spo2ValidationValues[i];

    spo2ValidationValues[PHYSIO_VALIDATION_SIZE - 1] = spo2;
  }

  if (CURRENT_MODE == SPOT_MODE && spotSpO2Count < SPOT_AGGREGATION_SIZE)
    spotSpO2Values[spotSpO2Count++] = (int16_t)spo2;
}

bool spO2CandidateStable()
{
  if (spo2ValidationCount < MIN_VALID_SPO2_WINDOWS)
  {
    return false;
  }

  int minValue = spo2ValidationValues[0];
  int maxValue = spo2ValidationValues[0];

  for (byte i = 1; i < spo2ValidationCount; i++)
  {
    if (spo2ValidationValues[i] < minValue)
    {
      minValue = spo2ValidationValues[i];
    }

    if (spo2ValidationValues[i] > maxValue)
    {
      maxValue = spo2ValidationValues[i];
    }
  }

  if (maxValue - minValue > SPO2_STABILITY_POINTS)
  {
    return false;
  }

  return true;
}


// ============================================================
// HEART RATE AVERAGE
// ============================================================

void calculateHeartRateAverage()
{
  if (
    validRateCount == 0
  )
  {
    averageBPM = 0;

    return;
  }

  int total = 0;

  for (
    byte i = 0;
    i < validRateCount;
    i++
  )
  {
    total +=
      rates[i];
  }

  averageBPM =
    total /
    validRateCount;
}


// ============================================================
// MEDIAN HEART RATE
// ============================================================

void calculateMedianHeartRate()
{
  if (
    validRateCount == 0
  )
  {
    medianBPM = 0;

    return;
  }

  byte temp[RATE_SIZE];

  for (
    byte i = 0;
    i < validRateCount;
    i++
  )
  {
    temp[i] =
      rates[i];
  }

  for (
    byte i = 0;
    i < validRateCount;
    i++
  )
  {
    for (
      byte j = i + 1;
      j < validRateCount;
      j++
    )
    {
      if (
        temp[j] <
        temp[i]
      )
      {
        byte swapValue =
          temp[i];

        temp[i] =
          temp[j];

        temp[j] =
          swapValue;
      }
    }
  }

  if (
    validRateCount % 2 == 1
  )
  {
    medianBPM =
      temp[
        validRateCount / 2
      ];
  }
  else
  {
    byte a =
      temp[
        (validRateCount / 2) - 1
      ];

    byte b =
      temp[
        validRateCount / 2
      ];

    medianBPM =
      (a + b) / 2;
  }
}


// ============================================================
// HRV - SDNN
// ============================================================

void calculateHRV()
{
  uint16_t count =
    CURRENT_MODE == SPOT_MODE
      ? spotRRCount
      : rrCount;

  if (count < 4)
  {
    hrvSDNN = 0.0;
    validRRForHRV = 0;
    spotHRVConfidence = 0.0;
    return;
  }

  float* rrValues = rrScratch;
  uint16_t n = min((uint16_t)SPOT_AGGREGATION_SIZE, count);

  for (uint16_t i = 0; i < n; i++)
  {
    rrValues[i] =
      CURRENT_MODE == SPOT_MODE
        ? (float)spotRRValues[i]
        : rrIntervals[i];
  }

  for (uint16_t i = 0; i < n; i++)
    for (uint16_t j = i + 1; j < n; j++)
      if (rrValues[j] < rrValues[i])
      {
        float t = rrValues[i];
        rrValues[i] = rrValues[j];
        rrValues[j] = t;
      }

  float medianRR =
    (n % 2 == 1)
      ? rrValues[n / 2]
      : (rrValues[(n / 2) - 1] + rrValues[n / 2]) / 2.0;

  float sum = 0.0;
  validRRForHRV = 0;

  for (uint16_t i = 0; i < n; i++)
  {
    float rr =
      CURRENT_MODE == SPOT_MODE
        ? (float)spotRRValues[i]
        : rrIntervals[i];

    if (
      rr >= 333.0 &&
      rr <= 1500.0 &&
      fabs(rr - medianRR) <= medianRR * 0.30
    )
    {
      sum += rr;
      validRRForHRV++;
    }
  }

  if (validRRForHRV < 4)
  {
    hrvSDNN = 0.0;
    spotHRVConfidence = 0.0;
    return;
  }

  float mean = sum / validRRForHRV;
  float variance = 0.0;

  for (uint16_t i = 0; i < n; i++)
  {
    float rr =
      CURRENT_MODE == SPOT_MODE
        ? (float)spotRRValues[i]
        : rrIntervals[i];

    if (
      rr >= 333.0 &&
      rr <= 1500.0 &&
      fabs(rr - medianRR) <= medianRR * 0.30
    )
    {
      float d = rr - mean;
      variance += d * d;
    }
  }

  variance /= validRRForHRV;
  hrvSDNN = sqrt(variance);
  spotHRVConfidence = calculateHRVConfidence();
}


// ============================================================
// SIGNAL QUALITY
// ============================================================

void calculateSignalQuality()
{
  if (
    !fingerDetected ||
    currentIR < FINGER_THRESHOLD ||
    currentIR >= MAX_VALID_IR
  )
  {
    signalQuality = 0;
    return;
  }

  uint32_t qualitySamples[PPG_WAVEFORM_SIZE];
  uint16_t count = 0;

  portENTER_CRITICAL(&ppgMux);

  count = ppgWaveformCount;

  for (
    uint16_t i = 0;
    i < count;
    i++
  )
  {
    qualitySamples[i] =
      ppgWaveform[i];
  }

  portEXIT_CRITICAL(&ppgMux);

  if (count < 10)
  {
    signalQuality = 50;
    return;
  }

  double mean = 0.0;
  double minimum =
    (double)qualitySamples[0];

  double maximum =
    (double)qualitySamples[0];

  for (
    uint16_t i = 0;
    i < count;
    i++
  )
  {
    double value =
      (double)qualitySamples[i];

    mean += value;

    if (value < minimum)
      minimum = value;

    if (value > maximum)
      maximum = value;
  }

  mean /=
    (double)count;

  if (
    mean < FINGER_THRESHOLD ||
    mean >= MAX_VALID_IR
  )
  {
    signalQuality = 0;
    return;
  }

  // ----------------------------------------------------------
  // WAVEFORM STABILITY
  // ----------------------------------------------------------

  double variance = 0.0;

  for (
    uint16_t i = 0;
    i < count;
    i++
  )
  {
    double difference =
      (double)qualitySamples[i] - mean;

    variance +=
      difference * difference;
  }

  variance /=
    (double)count;

  double standardDeviation =
    sqrt(variance);

  double coefficientVariation =
    mean > 0.0
      ? standardDeviation / mean
      : 1.0;

  double stabilityScore = 100.0;

  if (coefficientVariation >= 0.30)
  {
    stabilityScore = 45.0;
  }
  else if (coefficientVariation >= 0.20)
  {
    stabilityScore = 60.0;
  }
  else if (coefficientVariation >= 0.12)
  {
    stabilityScore = 75.0;
  }
  else if (coefficientVariation >= 0.08)
  {
    stabilityScore = 88.0;
  }

  // ----------------------------------------------------------
  // PPG PULSATILITY
  // ----------------------------------------------------------

  double waveformRange =
    maximum - minimum;

  double pulsatility =
    mean > 0.0
      ? waveformRange / mean
      : 0.0;

  double pulsatilityScore =
    constrain(
      pulsatility * 1000.0,
      0.0,
      100.0
    );

  // ----------------------------------------------------------
  // VALIDATED PHYSIOLOGICAL SUPPORT
  // ----------------------------------------------------------

  double spo2Support =
    totalSpO2Windows > 0
      ? (
          (double)validSpO2Windows /
          (double)totalSpO2Windows
        ) * 100.0
      : 50.0;

  spo2Support =
    constrain(
      spo2Support,
      0.0,
      100.0
    );

  double hrSupport =
    validRateCount >= 5
      ? 100.0
      : (
          (double)validRateCount /
          5.0
        ) * 100.0;

  hrSupport =
    constrain(
      hrSupport,
      0.0,
      100.0
    );

  // ----------------------------------------------------------
  // FINAL SIGNAL QUALITY
  // ----------------------------------------------------------

  double combinedScore =
    (stabilityScore * 0.40) +
    (pulsatilityScore * 0.25) +
    (spo2Support * 0.20) +
    (hrSupport * 0.15);

  signalQuality =
    (int)round(
      constrain(
        combinedScore,
        0.0,
        100.0
      )
    );
}

// ============================================================
// MPU6050
// ============================================================

void readMPU()
{
  if (!mpuSensorPresent)
    return;

  sensors_event_t accel;
  sensors_event_t gyro;
  sensors_event_t mpuTemp;

  mpu.getEvent(
    &accel,
    &gyro,
    &mpuTemp
  );

  float newAccelX = accel.acceleration.x;
  float newAccelY = accel.acceleration.y;
  float newAccelZ = accel.acceleration.z;
  float newGyroX = gyro.gyro.x;
  float newGyroY = gyro.gyro.y;
  float newGyroZ = gyro.gyro.z;

  float accelMagnitude =
    sqrt(
      newAccelX * newAccelX +
      newAccelY * newAccelY +
      newAccelZ * newAccelZ
    );

  float gyroMagnitude =
    sqrt(
      newGyroX * newGyroX +
      newGyroY * newGyroY +
      newGyroZ * newGyroZ
    );

  // Reject NaN/physically impossible IMU values before accumulation or
  // fall detection. Normal gravity is approximately 9.8 m/s^2.
  if (
    !isfinite(newAccelX) ||
    !isfinite(newAccelY) ||
    !isfinite(newAccelZ) ||
    !isfinite(newGyroX) ||
    !isfinite(newGyroY) ||
    !isfinite(newGyroZ) ||
    accelMagnitude < 0.5 ||
    accelMagnitude > 80.0 ||
    gyroMagnitude > 12.0
  )
    return;

  accelX = newAccelX;
  accelY = newAccelY;
  accelZ = newAccelZ;
  gyroX = newGyroX;
  gyroY = newGyroY;
  gyroZ = newGyroZ;

  tiltAngle =
    atan2(
      accelX,
      sqrt(
        accelY * accelY +
        accelZ * accelZ
      )
    ) *
    180.0 /
    PI;

  accelMagnitudeSum += accelMagnitude;
  gyroMagnitudeSum += gyroMagnitude;
  tiltSum += tiltAngle;
  mpuSampleCount++;

  if (
    CURRENT_MODE == CONTINUOUS_MODE &&
    continuousMonitoring
  )
  {
    updateContinuousFallDetection();
  }
}


// ============================================================
// CONTINUOUS FALL / HIGH-MOTION DETECTION
// ============================================================

void updateContinuousFallDetection()
{
  float accelMagnitude =
    sqrt(
      accelX * accelX +
      accelY * accelY +
      accelZ * accelZ
    );

  float gyroMagnitude =
    sqrt(
      gyroX * gyroX +
      gyroY * gyroY +
      gyroZ * gyroZ
    );

  if (fallState == 3)
  {
    if (
      lastConfirmedFallTime > 0 &&
      millis() - lastConfirmedFallTime >= FALL_EVENT_COOLDOWN
    )
    {
      fallState = 0;
      fallCandidateTime = 0;
      fallStillnessStart = 0;
      fallOrientationChanged = false;
      fallCandidatePeakAccel = 0.0;
      fallCandidatePeakGyro = 0.0;
    }

    return;
  }

  bool impactCandidate =
    accelMagnitude >= FALL_IMPACT_ACCEL_THRESHOLD ||
    gyroMagnitude >= FALL_IMPACT_GYRO_THRESHOLD;

  if (fallState == 0)
  {
    if (impactCandidate)
    {
      fallState = 1;
      fallCandidateTime = millis();
      fallImpactTime = millis();
      fallStillnessStart = 0;
      fallPreImpactTilt = tiltAngle;
      fallCandidatePeakAccel = accelMagnitude;
      fallCandidatePeakGyro = gyroMagnitude;
      fallOrientationChanged = false;

      Serial.println();
      Serial.println("WARNING: POSSIBLE FALL / IMPACT CANDIDATE");
      Serial.println("Monitoring orientation and post-impact stillness...");
    }

    return;
  }

  if (fallState == 1)
  {
    if (accelMagnitude > fallCandidatePeakAccel)
      fallCandidatePeakAccel = accelMagnitude;

    if (gyroMagnitude > fallCandidatePeakGyro)
      fallCandidatePeakGyro = gyroMagnitude;

    if (fabs(tiltAngle - fallPreImpactTilt) >= FALL_POSTURE_CHANGE_DEGREES)
      fallOrientationChanged = true;

    // A discrete event must resolve quickly. Sustained high movement is
    // treated as activity rather than a fall.
    if (millis() - fallCandidateTime > FALL_CANDIDATE_WINDOW)
    {
      fallState = 0;
      fallCandidateTime = 0;
      fallStillnessStart = 0;
      fallOrientationChanged = false;
      fallCandidatePeakAccel = 0.0;
      fallCandidatePeakGyro = 0.0;
      return;
    }

    bool postImpactStill =
      accelMagnitude <= FALL_STILL_ACCEL_MAX &&
      gyroMagnitude <= FALL_STILL_GYRO_MAX;

    if (postImpactStill)
    {
      if (fallStillnessStart == 0)
        fallStillnessStart = millis();

      if (
        millis() - fallStillnessStart >= FALL_STILLNESS_CONFIRM_TIME &&
        (
          fallOrientationChanged ||
          fallCandidatePeakAccel >= 28.0 ||
          fallCandidatePeakGyro >= 5.5
        )
      )
      {
        fallState = 2;
      }
    }
    else
    {
      fallStillnessStart = 0;
    }

    return;
  }

  if (fallState == 2)
  {
    bool confirmedStill =
      accelMagnitude <= FALL_STILL_ACCEL_MAX &&
      gyroMagnitude <= FALL_STILL_GYRO_MAX;

    if (!confirmedStill)
    {
      fallState = 0;
      fallCandidateTime = 0;
      fallStillnessStart = 0;
      fallOrientationChanged = false;
      fallCandidatePeakAccel = 0.0;
      fallCandidatePeakGyro = 0.0;
      return;
    }

    fallEventConfidence =
      constrain(
        55.0 +
        (fallCandidatePeakAccel >= 28.0 ? 12.0 : 0.0) +
        (fallCandidatePeakGyro >= 5.5 ? 10.0 : 0.0) +
        (fallOrientationChanged ? 18.0 : 0.0),
        50.0,
        95.0
      );

    fallEventDetected = true;
    lastConfirmedFallTime = millis();
    fallState = 3;

    Serial.println();
    Serial.println("================================================");
    Serial.println("CONFIRMED FALL EVENT");
    Serial.println("CONTINUOUS MODE ONLY");
    Serial.println("Emergency event will be sent to backend.");
    Serial.println("================================================");
  }
}


// ============================================================
// TEMPERATURE - START
// ============================================================

void startTemperatureConversion()
{
  if (!temperatureSensorPresent)
  {
    return;
  }

  // Non-blocking DS18B20 conversion. This is important in Continuous mode:
  // temperature must not hold up the sensor pipelines.
  ds18b20.requestTemperatures();
  lastTemperatureRequest = millis();
  temperatureConversionRunning = true;
}



// ============================================================
// TEMPERATURE - FINISH
// ============================================================

void finishTemperatureConversion()
{
  if (!temperatureSensorPresent || !temperatureConversionRunning)
  {
    return;
  }

  float temp = ds18b20.getTempCByIndex(0);

  if (
    temp != DEVICE_DISCONNECTED_C &&
    isfinite(temp) &&
    temp > 15.0 &&
    temp < 50.0
  )
  {
    temperatureC = temp;
    temperatureReadingValid = true;
  }
  else
  {
    temperatureReadingValid = false;
  }

  temperatureConversionRunning = false;
}



// ============================================================
// TEMPERATURE - SERVICE
// ============================================================

void serviceTemperature()
{
  if (!temperatureSensorPresent)
  {
    return;
  }

  unsigned long now = millis();

  if (temperatureConversionRunning)
  {
    // 10-bit DS18B20 conversion completes in about 94 ms. Allow a little
    // margin before reading it.
    if (now - lastTemperatureRequest >= 100UL)
    {
      finishTemperatureConversion();
    }
  }

  // Immediately schedule the next conversion after the previous one has
  // completed, maintaining approximately one real temperature update/sec.
  if (!temperatureConversionRunning && now - lastTemperatureRequest >= TEMPERATURE_INTERVAL)
  {
    startTemperatureConversion();
  }
}



// ============================================================
// FINAL RESULTS
// ============================================================

void printFinalResults()
{
  Serial.println();

  Serial.println(
    "================================================"
  );

  Serial.println(
    "          MEDJARVIS FINAL RESULT"
  );

  Serial.println(
    "================================================"
  );

  Serial.println();

  Serial.println(
    "----- MAX30102 -----"
  );

  if (
    finalSpO2 >= 70 &&
    finalSpO2 <= 100 &&
    spotSpO2Count >= MIN_VALID_SPO2_WINDOWS
  )
  {
    Serial.print(
      "SpO2: "
    );

    Serial.print(
      finalSpO2
    );

    Serial.println(
      " %"
    );
  }
  else
  {
    Serial.println(
      "SpO2: INVALID / NOT ENOUGH VALID WINDOWS"
    );
  }

  Serial.print(
    "Valid SpO2 Windows: "
  );

  Serial.println(
    validSpO2Windows
  );

  Serial.print(
    "Total SpO2 Windows: "
  );

  Serial.println(
    totalSpO2Windows
  );

  Serial.println();

  int finalValidatedHR =
    CURRENT_MODE == CONTINUOUS_MODE
      ? latestValidatedHeartRate
      : getValidatedSpotHeartRate();

  if (
    finalValidatedHR >= 40 &&
    finalValidatedHR <= 180
  )
  {
    Serial.print(
      "Heart Rate: "
    );

    Serial.print(
      finalValidatedHR
    );

    Serial.println(
      " BPM"
    );
  }
  else
  {
    Serial.println(
      "Heart Rate: INVALID / NOT ENOUGH STABLE BEATS"
    );
  }

  Serial.print(
    "Validated Beats: "
  );

  Serial.println(
    validRateCount
  );

  if (
    validAlgorithmHRWindows > 0
  )
  {
    float averageAlgorithmHR =
      algorithmHRSum /
      validAlgorithmHRWindows;

    Serial.print(
      "Algorithm HR Average: "
    );

    Serial.print(
      averageAlgorithmHR,
      1
    );

    Serial.println(
      " BPM"
    );
  }
  else
  {
    Serial.println(
      "Algorithm HR Average: --"
    );
  }

  if (
    hrvSDNN > 0.0 &&
    validRRForHRV >= 4
  )
  {
    Serial.print(
      "HRV SDNN: "
    );

    Serial.print(
      hrvSDNN,
      1
    );

    Serial.println(
      " ms"
    );
  }
  else
  {
    Serial.println(
      "HRV SDNN: NOT ENOUGH VALID BEATS"
    );
  }

  Serial.print(
    "Validated RR Intervals: "
  );

  Serial.println(
    rrCount
  );

  Serial.print(
    "Signal Quality: "
  );

  Serial.print(
    signalQuality
  );

  Serial.println(
    " %"
  );

  Serial.print("SpO2 Confidence: ");
  Serial.print(spotSpO2Confidence, 1);
  Serial.println(" %");

  Serial.print("Heart Rate Confidence: ");
  Serial.print(spotHRConfidence, 1);
  Serial.println(" %");

  Serial.print("HRV Confidence: ");
  Serial.print(spotHRVConfidence, 1);
  Serial.println(" %");

  Serial.print("Overall Measurement Confidence: ");
  Serial.print(measurementConfidence, 1);
  Serial.println(" %");

  Serial.print(
    "Final IR: "
  );

  Serial.println(
    currentIR
  );

  Serial.println();

  Serial.println(
    "----- DS18B20 -----"
  );

  if (
    temperatureSensorPresent
  )
  {
    Serial.print(
      "Temperature: "
    );

    Serial.print(
      temperatureC,
      2
    );

    Serial.println(
      " °C"
    );
  }
  else
  {
    Serial.println(
      "Temperature: SENSOR NOT FOUND"
    );
  }

  Serial.println();

  Serial.println(
    "----- MPU6050 -----"
  );

  Serial.print(
    "Average Acceleration Magnitude: "
  );

  Serial.print(
    accelMagnitudeSum,
    2
  );

  Serial.println(
    " m/s^2"
  );

  Serial.print(
    "Average Gyroscope Magnitude: "
  );

  Serial.print(
    gyroMagnitudeSum,
    2
  );

  Serial.println(
    " rad/s"
  );

  Serial.print(
    "Average Tilt: "
  );

  Serial.print(
    tiltSum,
    2
  );

  Serial.println(
    " degrees"
  );

  Serial.print(
    "Final Accel X: "
  );

  Serial.print(
    accelX,
    2
  );

  Serial.print(
    " | Y: "
  );

  Serial.print(
    accelY,
    2
  );

  Serial.print(
    " | Z: "
  );

  Serial.print(
    accelZ,
    2
  );

  Serial.println(
    " m/s^2"
  );

  Serial.print(
    "Final Gyro X: "
  );

  Serial.print(
    gyroX,
    2
  );

  Serial.print(
    " | Y: "
  );

  Serial.print(
    gyroY,
    2
  );

  Serial.print(
    " | Z: "
  );

  Serial.print(
    gyroZ,
    2
  );

  Serial.println(
    " rad/s"
  );

  Serial.println();

  Serial.println(
    "----- ACQUISITION -----"
  );

  Serial.print(
    "MAX30102 samples: "
  );

  Serial.println(
    maxSampleCount
  );

  Serial.print(
    "Valid optical samples: "
  );

  Serial.println(
    totalValidSpO2Samples
  );

  Serial.print(
    "Complete SpO2 windows: "
  );

  Serial.println(
    totalSpO2Windows
  );

  Serial.print(
    "Valid SpO2 windows: "
  );

  Serial.println(
    validSpO2Windows
  );

  Serial.print(
    "MPU6050 samples: "
  );

  Serial.println(
    mpuSampleCount
  );

  Serial.println();

  Serial.println(
    "================================================"
  );
}


// ============================================================
// FINAL JSON
// ============================================================

void printFinalJSON()
{
  Serial.println();

  Serial.println(
    "----- FINAL JSON -----"
  );

  Serial.print(
    "{"
  );

  Serial.print(
    "\"bandId\":\""
  );

  Serial.print(
    BAND_ID
  );

  Serial.print(
    "\""
  );

  Serial.print(
    ",\"spo2\":"
  );

  if (
    finalSpO2 >= 70 &&
    finalSpO2 <= 100
  )
  {
    Serial.print(
      finalSpO2
    );
  }
  else
  {
    Serial.print(
      "null"
    );
  }

  Serial.print(
    ",\"heartRate\":"
  );

  int jsonHeartRate =
    CURRENT_MODE == CONTINUOUS_MODE
      ? latestValidatedHeartRate
      : getValidatedSpotHeartRate();

  if (
    jsonHeartRate >= 40 &&
    jsonHeartRate <= 180
  )
  {
    Serial.print(
      jsonHeartRate
    );
  }
  else
  {
    Serial.print(
      "null"
    );
  }

  Serial.print(
    ",\"hrvSDNN\":"
  );

  if (
    hrvSDNN > 0.0 &&
    validRRForHRV >= 4
  )
  {
    Serial.print(
      hrvSDNN,
      1
    );
  }
  else
  {
    Serial.print(
      "null"
    );
  }

  Serial.print(
    ",\"temperature\":"
  );

  if (
    temperatureSensorPresent &&
    temperatureReadingValid
  )
  {
    Serial.print(
      temperatureC,
      2
    );
  }
  else
  {
    Serial.print(
      "null"
    );
  }

  Serial.print(
    ",\"tilt\":"
  );

  Serial.print(
    tiltSum,
    2
  );

  Serial.print(
    ",\"signalQuality\":"
  );

  Serial.print(
    signalQuality
  );

  Serial.print(
    ",\"accelMagnitude\":"
  );

  Serial.print(
    accelMagnitudeSum,
    2
  );

  Serial.print(
    ",\"gyroMagnitude\":"
  );

  Serial.print(
    gyroMagnitudeSum,
    2
  );

  Serial.print(
    ",\"accelX\":"
  );

  Serial.print(
    accelX,
    2
  );

  Serial.print(
    ",\"accelY\":"
  );

  Serial.print(
    accelY,
    2
  );

  Serial.print(
    ",\"accelZ\":"
  );

  Serial.print(
    accelZ,
    2
  );

  Serial.print(
    ",\"gyroX\":"
  );

  Serial.print(
    gyroX,
    2
  );

  Serial.print(
    ",\"gyroY\":"
  );

  Serial.print(
    gyroY,
    2
  );

  Serial.print(
    ",\"gyroZ\":"
  );

  Serial.print(
    gyroZ,
    2
  );

  Serial.print(
    ",\"measurementDuration\":"
  );

  if (
    CURRENT_MODE == SPOT_MODE
  )
  {
    Serial.print(
      "60"
    );
  }
  else
  {
    unsigned long elapsedSeconds =
      continuousSessionStart > 0
        ? (millis() - continuousSessionStart) / 1000UL
        : 0UL;

    if (elapsedSeconds < 1UL)
    {
      elapsedSeconds = 1UL;
    }

    Serial.print(elapsedSeconds);
  }

  Serial.print(
    ",\"mode\":\""
  );

  if (
    CURRENT_MODE == SPOT_MODE
  )
  {
    Serial.print(
      "spot"
    );
  }
  else
  {
    Serial.print(
      "continuous"
    );
  }

  Serial.print(
    "\""
  );

  Serial.print(
    ",\"maxSamples\":"
  );

  Serial.print(
    maxSampleCount
  );

  Serial.print(
    ",\"spo2WindowSamples\":"
  );

  Serial.print(
    totalValidSpO2Samples
  );

  Serial.print(
    ",\"mpuSamples\":"
  );

  Serial.print(
    mpuSampleCount
  );

  Serial.print(
    ",\"validatedBeats\":"
  );

  Serial.print(
    validRateCount
  );

  Serial.print(
    ",\"validatedRRIntervals\":"
  );

  Serial.print(
    rrCount
  );

  Serial.print(
    ",\"validSpO2Windows\":"
  );

  Serial.print(
    validSpO2Windows
  );

  Serial.print(
    ",\"fallDetected\":"
  );

  if (
    CURRENT_MODE == CONTINUOUS_MODE &&
    fallEventDetected
  )
  {
    Serial.print(
      "true"
    );
  }
  else
  {
    Serial.print(
      "false"
    );
  }

  Serial.print(
    ",\"wifiConnected\":"
  );

  if (
    WiFi.status() == WL_CONNECTED
  )
  {
    Serial.print(
      "true"
    );
  }
  else
  {
    Serial.print(
      "false"
    );
  }

  Serial.print(
    ",\"source\":\"ESP32\""
  );

  Serial.println(
    "}"
  );

  Serial.println(
    "----- END JSON -----"
  );
}


// ============================================================
// SEND VITALS TO MEDJARVIS BACKEND
// ============================================================

void sendVitalsToBackend(bool includePhysiologicalValues)
{
  Serial.println();

  Serial.println(
    "----- SENDING VITALS TO MEDJARVIS -----"
  );

  if (
    WiFi.status() != WL_CONNECTED
  )
  {
    Serial.println(
      "ERROR: WiFi is not connected."
    );

    Serial.println(
      "Vitals were NOT sent."
    );

    return;
  }

  String payload = "{";

  payload +=
    "\"bandId\":\"";

  payload +=
    BAND_ID;

  payload +=
    "\"";

  payload +=
    ",\"spo2\":";

  int payloadSpO2 =
    CURRENT_MODE == CONTINUOUS_MODE
      ? latestValidatedSpO2
      : finalSpO2;

  bool sendSpO2 =
    CURRENT_MODE == SPOT_MODE ||
    includePhysiologicalValues;

  if (
    sendSpO2 &&
    payloadSpO2 >= 70 &&
    payloadSpO2 <= 100
  )
  {
    payload +=
      String(payloadSpO2);
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"heartRate\":";

  int payloadHeartRate =
    CURRENT_MODE == CONTINUOUS_MODE
      ? latestValidatedHeartRate
      : getValidatedSpotHeartRate();

  bool sendHeartRate =
    CURRENT_MODE == SPOT_MODE ||
    includePhysiologicalValues;

  if (
    sendHeartRate &&
    payloadHeartRate >= 40 &&
    payloadHeartRate <= 180
  )
  {
    payload +=
      String(payloadHeartRate);
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"hrvSDNN\":";

  bool sendHRV =
    CURRENT_MODE == SPOT_MODE ||
    includePhysiologicalValues;

  if (
    sendHRV &&
    hrvSDNN > 0.0 &&
    validRRForHRV >= 4
  )
  {
    payload +=
      String(
        hrvSDNN,
        1
      );
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"temperature\":";

  if (
    temperatureSensorPresent &&
    temperatureReadingValid
  )
  {
    payload +=
      String(
        temperatureC,
        2
      );
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"tilt\":";

  if (CURRENT_MODE == CONTINUOUS_MODE)
  {
    payload += String(tiltAngle, 2);
  }
  else
  {
    payload += String(tiltSum, 2);
  }

  payload +=
    ",\"signalQuality\":";

  payload +=
    String(signalQuality);

  payload +=
    ",\"accelMagnitude\":";

  if (CURRENT_MODE == CONTINUOUS_MODE)
  {
    payload += String(
      sqrt(
        accelX * accelX +
        accelY * accelY +
        accelZ * accelZ
      ),
      2
    );
  }
  else
  {
    payload += String(accelMagnitudeSum, 2);
  }

  payload +=
    ",\"gyroMagnitude\":";

  if (CURRENT_MODE == CONTINUOUS_MODE)
  {
    payload += String(
      sqrt(
        gyroX * gyroX +
        gyroY * gyroY +
        gyroZ * gyroZ
      ),
      2
    );
  }
  else
  {
    payload += String(gyroMagnitudeSum, 2);
  }

  payload +=
    ",\"accelX\":";

  payload +=
    String(
      accelX,
      2
    );

  payload +=
    ",\"accelY\":";

  payload +=
    String(
      accelY,
      2
    );

  payload +=
    ",\"accelZ\":";

  payload +=
    String(
      accelZ,
      2
    );

  payload +=
    ",\"gyroX\":";

  payload +=
    String(
      gyroX,
      2
    );

  payload +=
    ",\"gyroY\":";

  payload +=
    String(
      gyroY,
      2
    );

  payload +=
    ",\"gyroZ\":";

  payload +=
    String(
      gyroZ,
      2
    );

  payload +=
    ",\"measurementDuration\":";

  if (
    CURRENT_MODE == SPOT_MODE
  )
  {
    payload +=
      "60";
  }
  else
  {
    unsigned long elapsedSeconds =
      continuousSessionStart > 0
        ? (millis() - continuousSessionStart) / 1000UL
        : 0UL;

    if (elapsedSeconds < 1UL)
    {
      elapsedSeconds = 1UL;
    }

    payload +=
      String(elapsedSeconds);
  }

  payload +=
    ",\"mode\":\"";

  if (
    CURRENT_MODE == SPOT_MODE
  )
  {
    payload +=
      "spot";
  }
  else
  {
    payload +=
      "continuous";
  }

  payload +=
    "\"";

  payload +=
    ",\"maxSamples\":";

  payload +=
    String(
      maxSampleCount
    );

  payload +=
    ",\"spo2WindowSamples\":";

  payload +=
    String(
      totalValidSpO2Samples
    );

  payload +=
    ",\"mpuSamples\":";

  payload +=
    String(
      mpuSampleCount
    );

  payload +=
    ",\"validatedBeats\":";

  payload +=
    String(
      validRateCount
    );

  payload +=
    ",\"validatedRRIntervals\":";

  payload +=
    String(
      rrCount
    );

  payload +=
    ",\"validSpO2Windows\":";

  payload +=
    String(
      validSpO2Windows
    );

  payload +=
    ",\"fallDetected\":";

  if (
    CURRENT_MODE == CONTINUOUS_MODE &&
    fallEventDetected
  )
  {
    payload +=
      "true";
  }
  else
  {
    payload +=
      "false";
  }

  payload +=
    ",\"wifiConnected\":";

  if (
    WiFi.status() == WL_CONNECTED
  )
  {
    payload +=
      "true";
  }
  else
  {
    payload +=
      "false";
  }

  payload +=
    ",\"measurementConfidence\":";

  payload += String(
    CURRENT_MODE == CONTINUOUS_MODE
      ? continuousMeasurementConfidence
      : measurementConfidence,
    1
  );

  payload +=
    ",\"spo2Confidence\":";

  payload += String(
    CURRENT_MODE == CONTINUOUS_MODE
      ? continuousSpO2Confidence
      : spotSpO2Confidence,
    1
  );

  payload +=
    ",\"heartRateConfidence\":";

  payload += String(
    CURRENT_MODE == CONTINUOUS_MODE
      ? continuousHRConfidence
      : spotHRConfidence,
    1
  );

  payload +=
    ",\"hrvConfidence\":";

  payload += String(
    CURRENT_MODE == CONTINUOUS_MODE
      ? continuousHRVConfidence
      : spotHRVConfidence,
    1
  );

  payload +=
    ",\"fallEventConfidence\":";

  payload += String(fallEventConfidence, 1);

  // Both modes expose recent REAL IR samples for the dashboard PPG waveform.
  if (CURRENT_MODE == CONTINUOUS_MODE || CURRENT_MODE == SPOT_MODE)
  {
    payload +=
      ",\"ppgWaveform\":[";

    uint16_t snapshotCount;
    uint32_t ppgSnapshot[PPG_WAVEFORM_SIZE];

    portENTER_CRITICAL(&ppgMux);

    snapshotCount = ppgWaveformCount;

    for (
  uint16_t i = 0;
  i < snapshotCount;
  i++
)
    {
      int index =
        (
          (int)ppgWaveformIndex -
          (int)snapshotCount +
          PPG_WAVEFORM_SIZE +
          (int)i
        ) %
        PPG_WAVEFORM_SIZE;

      ppgSnapshot[i] =
        ppgWaveform[index];
    }

    portEXIT_CRITICAL(&ppgMux);

    for (
  uint16_t i = 0;
  i < snapshotCount;
  i++
)
    {
      if (i > 0)
      {
        payload += ",";
      }

      payload +=
        String(
          (unsigned long)ppgSnapshot[i]
        );
    }

    payload +=
      "]";

    // Positions of confirmed beats inside the same rolling PPG snapshot.
    // These are generated only from the existing validated beat detector.
    payload +=
      ",\"ppgBeatPositions\":[";

    uint16_t beatPositions[PPG_BEAT_HISTORY_SIZE];
    byte beatPositionCount = 0;

    portENTER_CRITICAL(&ppgMux);

    if (snapshotCount > 0 && ppgSampleSequence >= snapshotCount)
    {
      uint32_t snapshotStartSequence =
        ppgSampleSequence - snapshotCount + 1;

      for (byte i = 0; i < ppgBeatSequenceCount; i++)
      {
        uint32_t beatSequence = ppgBeatSequence[i];

        if (
          beatSequence >= snapshotStartSequence &&
          beatSequence <= ppgSampleSequence
        )
        {
          beatPositions[beatPositionCount++] =
            (uint16_t)(beatSequence - snapshotStartSequence);
        }
      }
    }

    portEXIT_CRITICAL(&ppgMux);

    for (byte i = 0; i < beatPositionCount; i++)
    {
      if (i > 0)
        payload += ",";

      payload += String(beatPositions[i]);
    }

    payload +=
      "]";

  }

  payload +=
    ",\"source\":\"ESP32\"";

  payload +=
    "}";

  Serial.println();

  Serial.println(
    "JSON PAYLOAD:"
  );

  Serial.println(
    payload
  );

  Serial.println();

  HTTPClient http;

  http.begin(
    MEDJARVIS_API
  );

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.setTimeout(
    5000
  );

  Serial.print(
    "POST -> "
  );

  Serial.println(
    MEDJARVIS_API
  );

  int httpCode =
    http.POST(
      payload
    );

  if (
    httpCode > 0
  )
  {
    Serial.print(
      "HTTP Response Code: "
    );

    Serial.println(
      httpCode
    );

    String response =
      http.getString();

    Serial.println(
      "Backend Response:"
    );

    Serial.println(
      response
    );

    if (
      httpCode >= 200 &&
      httpCode < 300
    )
    {
      Serial.println();

      Serial.println(
        "VITALS SUCCESSFULLY SENT TO MEDJARVIS"
      );
    }
    else
    {
      Serial.println();

      Serial.println(
        "BACKEND REJECTED THE VITALS"
      );
    }
  }
  else
  {
    Serial.print(
      "HTTP POST FAILED. Error: "
    );

    Serial.println(
      http.errorToString(
        httpCode
      )
    );

    Serial.println(
      "Check backend, IP address and firewall."
    );
  }

  http.end();

  Serial.println(
    "----- END BACKEND SEND -----"
  );

  Serial.println();
}


// ============================================================
// SEND EMERGENCY EVENT TO MEDJARVIS BACKEND
// ============================================================

void sendEmergencyEvent()
{
  Serial.println();

  Serial.println(
    "----- SENDING EMERGENCY EVENT -----"
  );

  if (
    WiFi.status() != WL_CONNECTED
  )
  {
    Serial.println(
      "ERROR: WiFi is not connected."
    );

    Serial.println(
      "Emergency event was NOT sent."
    );

    return;
  }

  String payload = "{";

  payload +=
    "\"bandId\":\"";

  payload +=
    BAND_ID;

  payload +=
    "\"";

  payload +=
    ",\"type\":\"fall\"";

  payload +=
    ",\"severity\":\"HIGH\"";

  payload +=
    ",\"spo2\":";

  int emergencySpO2 =
    CURRENT_MODE == CONTINUOUS_MODE
      ? latestValidatedSpO2
      : finalSpO2;

  bool freshEmergencySpO2 =
    CURRENT_MODE != CONTINUOUS_MODE ||
    (latestSpO2Update > 0 && millis() - latestSpO2Update <= CONTINUOUS_VALUE_FRESHNESS);

  if (
    emergencySpO2 >= 70 &&
    emergencySpO2 <= 100 &&
    freshEmergencySpO2
  )
  {
    payload +=
      String(emergencySpO2);
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"heartRate\":";

  int emergencyHeartRate =
    CURRENT_MODE == CONTINUOUS_MODE
      ? latestValidatedHeartRate
      : getValidatedSpotHeartRate();

  bool freshEmergencyHeartRate =
    CURRENT_MODE != CONTINUOUS_MODE ||
    (latestHeartRateUpdate > 0 && millis() - latestHeartRateUpdate <= CONTINUOUS_VALUE_FRESHNESS);

  if (
    emergencyHeartRate >= 40 &&
    emergencyHeartRate <= 180 &&
    freshEmergencyHeartRate
  )
  {
    payload +=
      String(emergencyHeartRate);
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"hrvSDNN\":";

  if (
    hrvSDNN > 0.0 &&
    validRRForHRV >= 4
  )
  {
    payload +=
      String(
        hrvSDNN,
        1
      );
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"fallEventConfidence\":";

  payload +=
    String(
      fallEventConfidence,
      1
    );

  payload +=
    ",\"temperature\":";


  if (
    temperatureSensorPresent &&
    temperatureReadingValid
  )
  {
    payload +=
      String(
        temperatureC,
        2
      );
  }
  else
  {
    payload +=
      "null";
  }

  payload +=
    ",\"accelMagnitude\":";

  if (CURRENT_MODE == CONTINUOUS_MODE)
  {
    payload += String(
      sqrt(
        accelX * accelX +
        accelY * accelY +
        accelZ * accelZ
      ),
      2
    );
  }
  else
  {
    payload += String(accelMagnitudeSum, 2);
  }

  payload +=
    ",\"gyroMagnitude\":";

  if (CURRENT_MODE == CONTINUOUS_MODE)
  {
    payload += String(
      sqrt(
        gyroX * gyroX +
        gyroY * gyroY +
        gyroZ * gyroZ
      ),
      2
    );
  }
  else
  {
    payload += String(gyroMagnitudeSum, 2);
  }

  payload +=
    ",\"tilt\":";

  if (CURRENT_MODE == CONTINUOUS_MODE)
  {
    payload += String(tiltAngle, 2);
  }
  else
  {
    payload += String(tiltSum, 2);
  }

  

  payload +=
    "}";

  Serial.println();

  Serial.println(
    "EMERGENCY JSON:"
  );

  Serial.println(
    payload
  );

  HTTPClient http;

  http.begin(
    MEDJARVIS_EMERGENCY_API
  );

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.setTimeout(
    5000
  );

  Serial.print(
    "POST -> "
  );

  Serial.println(
    MEDJARVIS_EMERGENCY_API
  );

  int httpCode =
    http.POST(
      payload
    );

  if (
    httpCode > 0
  )
  {
    Serial.print(
      "Emergency HTTP Response: "
    );

    Serial.println(
      httpCode
    );

    String response =
      http.getString();

    Serial.println(
      "Emergency Backend Response:"
    );

    Serial.println(
      response
    );

    if (
      httpCode >= 200 &&
      httpCode < 300
    )
    {
      Serial.println();

      Serial.println(
        "EMERGENCY EVENT SUCCESSFULLY SENT"
      );
    }
    else
    {
      Serial.println();

      Serial.println(
        "EMERGENCY EVENT REJECTED"
      );
    }
  }
  else
  {
    Serial.print(
      "EMERGENCY HTTP POST FAILED: "
    );

    Serial.println(
      http.errorToString(
        httpCode
      )
    );
  }

  http.end();

  Serial.println(
    "----- END EMERGENCY SEND -----"
  );

  Serial.println();
}

// ============================================================
// CHECK MONITORING COMMAND
// ============================================================

void checkMonitoringCommand()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    return;
  }

  HTTPClient http;
  String url = String(MEDJARVIS_CONTROL_API) + "/" + String(BAND_ID);

  http.begin(url);
  http.setTimeout(1000);

  int httpCode = http.GET();

  if (httpCode <= 0)
  {
    http.end();
    return;
  }

  String response = http.getString();
  http.end();

  bool backendActive = response.indexOf("\"active\":true") >= 0;
  bool backendContinuous = response.indexOf("\"mode\":\"continuous\"") >= 0;
  bool backendSpot = response.indexOf("\"mode\":\"spot\"") >= 0;

  if (!backendActive)
  {
    // Observing inactive clears the completed-Spot guard. Only after this
    // transition can a later active:true Spot command start a new session.
    spotAwaitingFreshStart = false;

    if (monitoringActive || continuousMonitoring)
    {
      Serial.println("Backend command: STOP MONITORING");
    }

    continuousMonitoring = false;
    monitoringActive = false;
    measurementRunning = false;

    stopContinuousAcquisitionTask();
    stopContinuousMotionTask();
    stopSensorMeasurement();
    return;
  }

  if (backendActive)
  {
    if (backendContinuous)
    {
      bool wasInactive = !monitoringActive;
      bool modeChanged = CURRENT_MODE != CONTINUOUS_MODE;

      // If a live mode change is requested, stop the old tasks first so no
      // task can touch the MAX30102 while the main task reconfigures it.
      if (modeChanged)
      {
        continuousMonitoring = false;
        stopContinuousAcquisitionTask();
        stopContinuousMotionTask();
      }

      CURRENT_MODE = CONTINUOUS_MODE;
      continuousMonitoring = true;
      monitoringActive = true;

      if (wasInactive || modeChanged)
      {
        activateSensorMeasurement();
        Serial.println("Backend command: START CONTINUOUS");
      }
    }
    else if (backendSpot)
    {
      if (spotAwaitingFreshStart)
      {
        // This is the same completed Spot session still reported as active.
        // Do not restart it. Wait until backend /complete has been observed.
        return;
      }

      bool wasInactive = !monitoringActive;
      bool modeChanged = CURRENT_MODE != SPOT_MODE;

      if (modeChanged)
      {
        continuousMonitoring = false;
        stopContinuousAcquisitionTask();
        stopContinuousMotionTask();
      }

      CURRENT_MODE = SPOT_MODE;
      continuousMonitoring = false;
      monitoringActive = true;

      if (wasInactive || modeChanged)
      {
        activateSensorMeasurement();
        Serial.println("Backend command: START SPOT");
      }
    }
  }
}



// ============================================================
// ACTIVATE SENSOR MEASUREMENT
// ============================================================

void activateSensorMeasurement()
{
  if (!maxSensorPresent)
  {
    sendSensorStatus("SENSOR_ERROR", "MAX30102 sensor is not available.", -1);
    return;
  }

  if (i2cMutex != nullptr)
  {
    if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
      sendSensorStatus("SENSOR_ERROR", "Unable to access the I2C sensor bus.", -1);
      return;
    }
  }

  maxSensor.setPulseAmplitudeRed(MAX_LED_BRIGHTNESS);
  maxSensor.setPulseAmplitudeIR(MAX_LED_BRIGHTNESS);
  maxSensor.setPulseAmplitudeGreen(0);
  maxSensor.clearFIFO();

  if (i2cMutex != nullptr)
  {
    xSemaphoreGive(i2cMutex);
  }

  sendSensorStatus("STARTING", "Wearable monitoring starting.", -1);
  sendSensorStatus("SENSOR_READY", "Sensors ready.", -1);
}



// ============================================================
// STOP SENSOR MEASUREMENT
// ============================================================

void stopSensorMeasurement()
{
  if (maxSensorPresent)
  {
    if (i2cMutex != nullptr)
    {
      if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE)
      {
        maxSensor.clearFIFO();
        maxSensor.setPulseAmplitudeRed(0);
        maxSensor.setPulseAmplitudeIR(0);
        maxSensor.setPulseAmplitudeGreen(0);
        xSemaphoreGive(i2cMutex);
      }
    }
    else
    {
      maxSensor.clearFIFO();
      maxSensor.setPulseAmplitudeRed(0);
      maxSensor.setPulseAmplitudeIR(0);
      maxSensor.setPulseAmplitudeGreen(0);
    }
  }

  measurementRunning = false;
  stableFingerDetected = false;
  fingerDetected = false;
}



// ============================================================
// NOTIFY MONITORING COMPLETE
// ============================================================

void notifyMonitoringComplete()
{
  if (
    WiFi.status() != WL_CONNECTED
  )
  {
    return;
  }

  HTTPClient http;

  String url =
    String(
      MEDJARVIS_CONTROL_API
    )
    +
    "/complete/"
    +
    String(BAND_ID);

  http.begin(
    url
  );

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  int httpCode =
    http.POST(
      "{}"
    );

  Serial.print(
    "Monitoring complete HTTP status: "
  );

  Serial.println(
    httpCode
  );

  http.end();
}


// ============================================================
// SEND SENSOR STATUS
// ============================================================

void sendSensorStatus(
  const char* status,
  const char* message,
  int remainingSeconds
)
{
  // ----------------------------------------------------------
  // Avoid repeatedly sending identical status messages.
  // MEASURING is intentionally allowed repeatedly.
  // ----------------------------------------------------------

  if (
    strcmp(
      status,
      "MEASURING"
    ) != 0 &&
    lastSensorStatus == String(status)
  )
  {
    return;
  }

  if (
    WiFi.status() != WL_CONNECTED
  )
  {
    return;
  }

  lastSensorStatus = String(status);


  HTTPClient http;

  // Sensor-status updates use the dedicated /status route.
  // The control API is reserved for START/STOP state polling.
  String statusUrl =
    String(MEDJARVIS_API) +
    "/status";

  http.begin(
    statusUrl
  );

  http.addHeader(
    "Content-Type",
    "application/json"
  );


  String mode =
    (
      CURRENT_MODE == CONTINUOUS_MODE
    )
    ?
    "continuous"
    :
    "spot";


  String json =
    "{";


  json +=
    "\"bandId\":\"" +
    String(BAND_ID) +
    "\",";


  json +=
    "\"status\":\"" +
    String(status) +
    "\",";


  json +=
    "\"message\":\"" +
    String(message) +
    "\",";


  json +=
    "\"remainingSeconds\":";

  if (remainingSeconds >= 0)
  {
    json += String(remainingSeconds);
  }
  else
  {
    json += "null";
  }

  json += ",";


  json +=
    "\"mode\":\"" +
    mode +
    "\",";


  json +=
    "\"wifiConnected\":" +
    String(
      WiFi.status() == WL_CONNECTED
      ?
      "true"
      :
      "false"
    );


  json +=
    "}";


  http.POST(
    json
  );

  http.end();
}


// ============================================================
// RESET SENSOR STATUS STATE
// ============================================================

void resetSensorStatusState()
{
  lastSensorStatus =
    "";
}


// ============================================================
// CURRENT FINGER SIGNAL
// ============================================================

bool fingerSignalCurrentlyPresent()
{
  return (
    currentIR >= FINGER_THRESHOLD &&
    currentIR < MAX_VALID_IR
  );
}


// ============================================================
// WAIT FOR STABLE FINGER
// ============================================================

void waitForStableFinger()
{
  sendSensorStatus(
    "WAITING_FOR_FINGER",
    "Place your finger on the MAX30102 sensor and hold still.",
    -1
  );

  fingerStableStart = 0;
  stableFingerDetected = false;
  fingerLossDetected = false;
  fingerMissingStart = 0;

  while (
    monitoringActive &&
    (CURRENT_MODE == SPOT_MODE || CURRENT_MODE == CONTINUOUS_MODE)
  )
  {
    // Safe to service MAX30102 and poll backend here because a
    // protected acquisition window has NOT started yet.
    serviceMAX30102();

    if (fingerSignalCurrentlyPresent())
    {
      fingerDetected = true;
      fingerMissingStart = 0;

      if (fingerStableStart == 0)
      {
        fingerStableStart = millis();

        sendSensorStatus(
          "FINGER_DETECTED",
          "Finger detected. Keep your finger still.",
          -1
        );

        sendSensorStatus(
          "STABILIZING",
          "Finger detected. Keep your finger still while the signal stabilizes.",
          -1
        );
      }

      if (millis() - fingerStableStart >= FINGER_STABLE_TIME)
      {
        stableFingerDetected = true;

        sendSensorStatus(
          "SIGNAL_STABLE",
          "Signal stable. Starting measurement.",
          -1
        );

        return;
      }
    }
    else
    {
      fingerDetected = false;
      fingerStableStart = 0;
      stableFingerDetected = false;
      fingerMissingStart = 0;

      sendSensorStatus(
        "WAITING_FOR_FINGER",
        "Place your finger on the MAX30102 sensor and hold still.",
        -1
      );
    }

    if (millis() - lastControlCheck >= CONTROL_CHECK_INTERVAL)
    {
      checkMonitoringCommand();
      lastControlCheck = millis();
    }

    delay(5);
  }
}
