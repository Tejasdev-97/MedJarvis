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
//    - 15 seconds
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
  "http://10.21.154.183:5000/api/vitals";

const char* MEDJARVIS_EMERGENCY_API =
  "http://10.21.154.183:5000/api/emergency";

const char* MEDJARVIS_CONTROL_API =
  "http://10.21.154.183:5000/api/vitals/control";


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

// Spot measurement = 15 seconds.
const unsigned long SPOT_DURATION = 15000UL;

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
// the first dashboard physiological update after the initial 15-second
// acquisition period. No value is fabricated when validation has failed.
const unsigned long CONTINUOUS_PHYSIO_WARMUP = 15000UL;


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
// 15 sec at 100 Hz
// approximately 1500 samples
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
#define PHYSIO_VALIDATION_SIZE 8
#define MIN_VALID_HR_SAMPLES 5
#define MIN_VALID_SPO2_WINDOWS 5
#define HR_STABILITY_PERCENT 0.12
#define SPO2_STABILITY_POINTS 2

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


// ============================================================
// HRV
// ============================================================

#define RR_BUFFER_SIZE 40

float rrIntervals[RR_BUFFER_SIZE];

byte rrSpot = 0;

byte rrCount = 0;

float hrvSDNN = 0.0;


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
const unsigned long FINGER_LOSS_GRACE_TIME = 300UL;

unsigned long measurementStartTime = 0;

unsigned long measurementEndTime = 0;

unsigned long fingerStableStart = 0;


// ============================================================
// SAMPLE COUNTERS
// ============================================================

unsigned long maxSampleCount = 0;


// ============================================================
// CONTINUOUS MONITORING
// ============================================================

bool continuousMonitoring = false;

bool monitoringActive = false;

bool fallEventDetected = false;

unsigned long fallCandidateTime = 0;

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
#define PPG_WAVEFORM_SIZE 128
portMUX_TYPE ppgMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t ppgWaveform[PPG_WAVEFORM_SIZE];
volatile byte ppgWaveformIndex = 0;
volatile byte ppgWaveformCount = 0;

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

const float FALL_ACCEL_THRESHOLD = 25.0;

const float FALL_GYRO_THRESHOLD = 4.0;

const unsigned long FALL_INACTIVITY_TIME = 2000UL;


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

void calculateSignalQuality();

bool heartRateCandidateStable();
bool spO2CandidateStable();
void recordHeartRateCandidate(int bpm);
int getValidatedSpotHeartRate()
{
  if (!heartRateCandidateStable())
  {
    return 0;
  }

  float sum = 0.0;

  for (byte i = 0; i < hrValidationCount; i++)
  {
    sum += hrValidationValues[i];
  }

  return
    (int)round(
      sum /
      hrValidationCount
    );
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
void recordAlgorithmHeartRateCandidate(int bpm);
bool algorithmHeartRateCandidateStable();
int getValidatedAlgorithmHeartRate();
int getValidatedSpotHeartRate();

void readMPU();

void updateContinuousFallDetection();

void startTemperatureConversion();

void finishTemperatureConversion();

void serviceTemperature();

void waitForStableFinger();

bool fingerSignalCurrentlyPresent();

void runSpotMeasurement();

void runContinuousMonitoring();

void finishMeasurementCalculations();

void printFinalResults();

void printFinalJSON();

void sendVitalsToBackend(bool includePhysiologicalValues = true);

void sendEmergencyEvent();

void checkMonitoringCommand();

void startContinuousAcquisitionTask();
void stopContinuousAcquisitionTask();
void continuousMAX30102Task(void* parameter);
void startContinuousMotionTask();
void stopContinuousMotionTask();
void continuousMotionTask(void* parameter);
void resetContinuousProcessingState();
void appendPPGSample(uint32_t irValue);

void activateSensorMeasurement();

void stopSensorMeasurement();

void notifyMonitoringComplete();

void sendSensorStatus(
  const char* status,
  const char* message,
  int remainingSeconds
);

void resetSensorStatusState();


void runSpotMeasurement()
{
  resetMeasurementData();

  measurementRunning = true;

  stableFingerDetected = true;

  Serial.println();

  Serial.println(
    "================================================"
  );

  Serial.println(
    "       MEDJARVIS SPOT MEASUREMENT"
  );

  Serial.println(
    "================================================"
  );

  Serial.println(
    "Duration: 15 seconds"
  );

  Serial.println(
    "Emergency detection: DISABLED"
  );

  Serial.println(
    "SpO2: multiple 100-sample windows"
  );

  Serial.println();

  Serial.println(
    "KEEP FINGER COMPLETELY STILL."
  );

  // ----------------------------------------------------------
  // CRITICAL ACQUISITION RULE:
  //
  // From this point until the 15-second acquisition ends,
  // DO NOT perform HTTP requests. The MAX30102 must be
  // serviced continuously so its FIFO does not starve.
  //
  // The frontend already knows the monitoring session is active,
  // so a single MEASURING status is sufficient during acquisition.
  // ----------------------------------------------------------

  sendSensorStatus(
    "MEASURING",
    "Reading started. Keep your finger still.",
    15
  );

  Serial.println();


  maxSensor.clearFIFO();


  if (
    temperatureSensorPresent
  )
  {
    startTemperatureConversion();
  }


  // Start the actual 15-second acquisition clock only after
  // all pre-acquisition network work has finished.
  measurementStartTime = millis();


  unsigned long lastMPUTime = millis();

  unsigned long lastTemperatureTime =
    millis();

  // ----------------------------------------------------------
  // 15-SECOND SENSOR-ONLY ACQUISITION LOOP
  // ----------------------------------------------------------

  while (
    millis() - measurementStartTime
    <
    SPOT_DURATION
  )
  {
    // --------------------------------------------------------
    // MAX30102 HAS HIGHEST PRIORITY.
    // No HTTP requests are allowed inside this loop.
    // --------------------------------------------------------

    serviceMAX30102();

    if (fingerLossDetected)
    {
      measurementRunning = false;
      maxSensor.clearFIFO();
      fingerDetected = false;
      stableFingerDetected = false;

      sendSensorStatus(
        "FINGER_REMOVED",
        "Please place your finger back on the sensor and hold still.",
        -1
      );

      Serial.println(
        "Spot measurement discarded: finger removed."
      );

      // Spot is a single-shot measurement. Never restart it automatically
      // after a failed acquisition. The user must press START again.
      continuousMonitoring = false;
      monitoringActive = false;
      measurementRunning = false;
      spotAwaitingFreshStart = true;
      stopSensorMeasurement();
      notifyMonitoringComplete();

      return;
    }


    // --------------------------------------------------------
    // MPU6050
    // Read approximately every 50 ms.
    // --------------------------------------------------------

    if (
      millis() - lastMPUTime
      >=
      50UL
    )
    {
      readMPU();

      lastMPUTime = millis();
    }


    // --------------------------------------------------------
    // DS18B20
    // --------------------------------------------------------

    if (
      millis() - lastTemperatureTime
      >=
      TEMPERATURE_INTERVAL
    )
    {
      serviceTemperature();

      lastTemperatureTime = millis();
    }


    // Small cooperative delay.
    // Keeps ESP32 responsive without introducing blocking
    // network operations.
    delay(1);
  }


  measurementEndTime = millis();

  measurementRunning = false;


  // ----------------------------------------------------------
  // ONLY NOW can we perform backend/network operations.
  // ----------------------------------------------------------
  // The MAX30102 acquisition is now finished, so one control check is safe.
  // If the user pressed STOP during the 15-second Spot acquisition, abort
  // the result instead of saving a reading that the user cancelled.
  // ----------------------------------------------------------

  checkMonitoringCommand();

  if (!monitoringActive || CURRENT_MODE != SPOT_MODE)
  {
    measurementRunning = false;
    continuousMonitoring = false;
    monitoringActive = false;
    stopSensorMeasurement();

    sendSensorStatus(
      "SESSION_STOPPED",
      "Spot monitoring stopped before the final reading was saved.",
      0
    );

    Serial.println("Spot result discarded because monitoring was stopped.");
    return;
  }


  // ----------------------------------------------------------
  // FINAL PROCESSING
  // ----------------------------------------------------------

  finishMeasurementCalculations();


  Serial.println();

  Serial.println(
    "================================================"
  );

  Serial.println(
    "       SPOT MEASUREMENT COMPLETE"
  );

  Serial.println(
    "================================================"
  );

  printFinalResults();

  printFinalJSON();


  // ----------------------------------------------------------
  // SEND ONE FINAL VITAL READING
  // ----------------------------------------------------------

  sendSensorStatus(
    "READING_COMPLETE",
    "Spot reading completed.",
    0
  );

  sendVitalsToBackend(true);


  // ----------------------------------------------------------
  // TELL BACKEND THAT THE SPOT SESSION IS COMPLETE.
  //
  // This allows the frontend to return automatically to
  // the Start state.
  // ----------------------------------------------------------

  notifyMonitoringComplete();


  sendSensorStatus(
    "SESSION_COMPLETE",
    "Spot monitoring session completed.",
    0
  );


  // ----------------------------------------------------------
  // SPOT MODE MUST NOT AUTOMATICALLY RESTART.
  // ----------------------------------------------------------

  continuousMonitoring = false;

  monitoringActive = false;

  CURRENT_MODE = SPOT_MODE;

  // Do not accept a stale backend active:true as a new Spot START.
  // The next genuine Spot START is accepted only after the backend has
  // returned to active:false.
  spotAwaitingFreshStart = true;


  Serial.println();

  Serial.println(
    "Spot mode finished. Waiting for next START command."
  );

  Serial.println();
}


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
  Serial.println();

  if (!maxSensorPresent)
  {
    sendSensorStatus("SENSOR_ERROR", "MAX30102 sensor is not available.", -1);
    continuousMonitoring = false;
    monitoringActive = false;
    goto continuous_cleanup;
  }

  // Wait for the initial stable finger before starting live acquisition.
  waitForStableFinger();

  if (!continuousMonitoring || !monitoringActive)
  {
    goto continuous_cleanup;
  }

  // Do not allow stabilization samples to become part of live processing.
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
  {
    startTemperatureConversion();
  }

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
    // Control polling runs on the Arduino/main task. The MAX30102 and
    // motion/temperature pipelines continue in their dedicated tasks.
    if (millis() - lastContinuousControlCheck >= CONTINUOUS_CONTROL_INTERVAL)
    {
      checkMonitoringCommand();
      lastContinuousControlCheck = millis();
    }

    if (!continuousMonitoring || !monitoringActive)
    {
      break;
    }

    // Network update only. Sensor acquisition is not performed here.
    // Motion/temperature are published every ~1 second.
    // HR/SpO2/HRV are published only every ~15 seconds, while the MAX30102
    // continues acquiring continuously in its dedicated task.
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

        sendVitalsToBackend(physiologicalUpdateDue);

        if (physiologicalUpdateDue)
        {
          lastContinuousPhysioUpdate = millis();
        }

        if (fallEventDetected)
        {
          Serial.println();
          Serial.println("!!! FALL / HIGH MOTION EVENT DETECTED !!!");
          sendEmergencyEvent();
          fallEventDetected = false;
        }
      }

      lastContinuousBackendUpdate = millis();
    }

    // Finger loss invalidates the current optical state, but does not end
    // the Continuous session. Stop both sensor tasks before touching the
    // MAX30102 from the main task.
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
      {
        break;
      }

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
      {
        startTemperatureConversion();
      }

      startContinuousAcquisitionTask();
      sendSensorStatus(
        "MEASURING",
        "Finger restored. Continuous live monitoring resumed.",
        -1
      );

      // Motion task normally remains alive during finger removal. If it was
      // stopped for any reason, restart it now.
      if (motionTaskHandle == nullptr)
      {
        startContinuousMotionTask();
      }
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


  currentIR = 0;

  currentRed = 0;


  finalSpO2 = 0;

  latestValidatedSpO2 = 0;
  latestValidatedHeartRate = 0;
  latestSpO2Update = 0;
  latestHeartRateUpdate = 0;

  portENTER_CRITICAL(&ppgMux);
  ppgWaveformIndex = 0;
  ppgWaveformCount = 0;

  for (int i = 0; i < PPG_WAVEFORM_SIZE; i++)
  {
    ppgWaveform[i] = 0;
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


  fallEventDetected = false;

  fallCandidateTime = 0;


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

    if (now - lastMotionSample >= 50UL)
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
  for (int i = 0; i < PPG_WAVEFORM_SIZE; i++)
  {
    ppgWaveform[i] = 0;
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
    uint32_t irValue = maxSensor.getIR();
    uint32_t redValue = maxSensor.getRed();

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

  processHeartbeat(
    irValue,
    millis()
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

  if (
    windowValidSpO2 &&
    windowSpO2 >= 70 &&
    windowSpO2 <= 100
  )
  {
    spo2Sum +=
      (float)windowSpO2;

    validSpO2Windows++;

    // A mathematically valid algorithm window is NOT automatically a
    // dashboard-valid physiological reading. Keep several windows and only
    // expose SpO2 when the recent windows agree closely.
    recordSpO2Candidate(windowSpO2);

    if (
      spO2CandidateStable() &&
      (
        CURRENT_MODE != CONTINUOUS_MODE ||
        millis() - continuousSessionStart >= CONTINUOUS_PHYSIO_WARMUP
      )
    )
    {
      int stableSpO2 = 0;

      for (byte i = 0; i < spo2ValidationCount; i++)
      {
        stableSpO2 += spo2ValidationValues[i];
      }

      stableSpO2 =
        (int)round(
          stableSpO2 /
          (float)spo2ValidationCount
        );

      latestValidatedSpO2 = stableSpO2;
      latestSpO2Update = millis();
    }
  }

  if (
    windowValidHR &&
    windowHR >= 40 &&
    windowHR <= 180
  )
  {
    algorithmHRSum +=
      (float)windowHR;

    validAlgorithmHRWindows++;

    // Keep Maxim window-HR validation separate from beat-derived HR.
    if (CURRENT_MODE == CONTINUOUS_MODE)
    {
      recordAlgorithmHeartRateCandidate((int)windowHR);

      if (
        millis() - continuousSessionStart >= CONTINUOUS_PHYSIO_WARMUP &&
        latestHeartRateUpdate == 0 &&
        algorithmHeartRateCandidateStable()
      )
      {
        latestValidatedHeartRate =
          getValidatedAlgorithmHeartRate();

        latestHeartRateUpdate = millis();
      }
    }
  }

  // Keep the newest 75 samples and fill the remaining 25 positions with
  // new samples. This creates overlapping rolling windows instead of
  // isolated one-second blocks.
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

void calculateFinalSpO2()
{
  if (!spO2CandidateStable())
  {
    finalSpO2 = 0;
    return;
  }

  // Use the recent validated windows rather than averaging every window in
  // the session. This prevents early poor-contact windows from contaminating
  // the final Spot result.
  int sortedValues[PHYSIO_VALIDATION_SIZE];

  for (byte i = 0; i < spo2ValidationCount; i++)
  {
    sortedValues[i] = spo2ValidationValues[i];
  }

  for (byte i = 0; i < spo2ValidationCount; i++)
  {
    for (byte j = i + 1; j < spo2ValidationCount; j++)
    {
      if (sortedValues[j] < sortedValues[i])
      {
        int swapValue = sortedValues[i];
        sortedValues[i] = sortedValues[j];
        sortedValues[j] = swapValue;
      }
    }
  }

  finalSpO2 =
    sortedValues[
      spo2ValidationCount / 2
    ];

  if (finalSpO2 < 70 || finalSpO2 > 100)
  {
    finalSpO2 = 0;
  }
}


// ============================================================
// HEARTBEAT PROCESSING
// ============================================================

void processHeartbeat(
  uint32_t irValue,
  unsigned long sampleTime
)
{
  if (
    !checkForBeat(irValue)
  )
  {
    return;
  }

  unsigned long beatTime =
    sampleTime;

  if (
    lastBeat == 0
  )
  {
    lastBeat =
      beatTime;

    return;
  }

  unsigned long delta =
    beatTime -
    lastBeat;

  // IMPORTANT: do not advance lastBeat when a beat candidate is rejected.
  // Advancing it on a bad candidate corrupts the next RR interval and can
  // create false values such as 44/158 BPM.
  if (
    delta < 333 ||
    delta > 1500
  )
  {
    return;
  }

  lastBeat =
    beatTime;

  float calculatedBPM =
    60000.0 /
    (float)delta;

  if (
    calculatedBPM < 40.0 ||
    calculatedBPM > 180.0
  )
  {
    return;
  }

  // Spot mode keeps the 30% consistency filter. Continuous mode uses
  // the library's beat detection plus the physiological 40-180 BPM bounds
  // without suppressing genuine rapid changes.
  if (CURRENT_MODE == SPOT_MODE && validRateCount >= 3)
  {
    float recentAverage = 0.0;

    for (byte i = 0; i < validRateCount; i++)
    {
      recentAverage += rates[i];
    }

    recentAverage /= validRateCount;

    float difference = fabs(calculatedBPM - recentAverage);

    if (difference > recentAverage * 0.30)
    {
      return;
    }
  }

  currentBPM =
    calculatedBPM;

  rates[rateSpot] =
    (byte)round(
      calculatedBPM
    );

  rateSpot++;

  if (
    rateSpot >= RATE_SIZE
  )
  {
    rateSpot = 0;
  }

  if (
    validRateCount < RATE_SIZE
  )
  {
    validRateCount++;
  }

  // A beat-derived BPM is NOT dashboard-ready by itself. Require multiple
  // consecutive beat intervals to agree before exposing it.
  recordHeartRateCandidate((int)round(calculatedBPM));

  if (
    heartRateCandidateStable() &&
    (
      CURRENT_MODE != CONTINUOUS_MODE ||
      millis() - continuousSessionStart >= CONTINUOUS_PHYSIO_WARMUP
    )
  )
  {
    int stableHR = 0;

    for (byte i = 0; i < hrValidationCount; i++)
    {
      stableHR += hrValidationValues[i];
    }

    stableHR =
      (int)round(
        stableHR /
        (float)hrValidationCount
      );

    latestValidatedHeartRate = stableHR;
    latestHeartRateUpdate = millis();
  }

  rrIntervals[rrSpot] =
    (float)delta;

  rrSpot++;

  if (
    rrSpot >= RR_BUFFER_SIZE
  )
  {
    rrSpot = 0;
  }

  if (
    rrCount < RR_BUFFER_SIZE
  )
  {
    rrCount++;
  }

  calculateHeartRateAverage();

  calculateMedianHeartRate();

  calculateHRV();
}


// ============================================================
// PHYSIOLOGICAL VALUE VALIDATION
// ============================================================

void recordHeartRateCandidate(int bpm)
{
  if (bpm < 40 || bpm > 180)
  {
    return;
  }

  if (hrValidationCount < PHYSIO_VALIDATION_SIZE)
  {
    hrValidationValues[hrValidationCount++] = bpm;
  }
  else
  {
    for (byte i = 1; i < PHYSIO_VALIDATION_SIZE; i++)
    {
      hrValidationValues[i - 1] = hrValidationValues[i];
    }

    hrValidationValues[PHYSIO_VALIDATION_SIZE - 1] = bpm;
  }
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
  {
    return;
  }

  if (spo2ValidationCount < PHYSIO_VALIDATION_SIZE)
  {
    spo2ValidationValues[spo2ValidationCount++] = spo2;
  }
  else
  {
    for (byte i = 1; i < PHYSIO_VALIDATION_SIZE; i++)
    {
      spo2ValidationValues[i - 1] = spo2ValidationValues[i];
    }

    spo2ValidationValues[PHYSIO_VALIDATION_SIZE - 1] = spo2;
  }
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
  if (
    rrCount < 3
  )
  {
    hrvSDNN = 0.0;

    return;
  }

  float sum = 0.0;

  for (
    byte i = 0;
    i < rrCount;
    i++
  )
  {
    sum +=
      rrIntervals[i];
  }

  float mean =
    sum /
    rrCount;

  float variance =
    0.0;

  for (
    byte i = 0;
    i < rrCount;
    i++
  )
  {
    float difference =
      rrIntervals[i] -
      mean;

    variance +=
      difference *
      difference;
  }

  variance /=
    rrCount;

  hrvSDNN =
    sqrt(
      variance
    );
}


// ============================================================
// SIGNAL QUALITY
// ============================================================

void calculateSignalQuality()
{
  // Prototype optical-contact/signal indicator, not a clinical quality index.
  // It is dynamic in BOTH modes: no finger = 0 and stronger usable contact
  // generally produces a higher score.
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
  byte count = 0;

  portENTER_CRITICAL(&ppgMux);

  count = ppgWaveformCount;

  for (byte i = 0; i < count; i++)
  {
    qualitySamples[i] = ppgWaveform[i];
  }

  portEXIT_CRITICAL(&ppgMux);

  double mean = (double)currentIR;

  if (count >= 10)
  {
    mean = 0.0;

    for (byte i = 0; i < count; i++)
    {
      mean += (double)qualitySamples[i];
    }

    mean /= (double)count;
  }

  if (
    mean < FINGER_THRESHOLD ||
    mean >= MAX_VALID_IR
  )
  {
    signalQuality = 0;
    return;
  }

  // 10k is the finger-detection threshold; ~120k is a strong practical
  // optical contact target for this prototype. This is not calibrated as a
  // clinical SQI or a physical-distance measurement.
  const double QUALITY_TARGET_IR = 120000.0;

  double contactScore =
    ((mean - (double)FINGER_THRESHOLD) /
     (QUALITY_TARGET_IR - (double)FINGER_THRESHOLD)) * 100.0;

  contactScore =
    constrain(
      contactScore,
      0.0,
      100.0
    );

  double stabilityScore = 100.0;

  if (count >= 10)
  {
    double variance = 0.0;

    for (byte i = 0; i < count; i++)
    {
      double difference =
        (double)qualitySamples[i] - mean;

      variance +=
        difference * difference;
    }

    variance /= (double)count;

    double standardDeviation =
      sqrt(variance);

    double coefficientVariation =
      mean > 0.0
        ? standardDeviation / mean
        : 1.0;

    if (coefficientVariation >= 0.30)
    {
      stabilityScore = 35.0;
    }
    else if (coefficientVariation >= 0.15)
    {
      stabilityScore = 60.0;
    }
    else if (coefficientVariation >= 0.08)
    {
      stabilityScore = 80.0;
    }
  }

  double combinedScore =
    (contactScore * 0.75) +
    (stabilityScore * 0.25);

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
  {
    return;
  }

  sensors_event_t accel;

  sensors_event_t gyro;

  sensors_event_t mpuTemp;

  mpu.getEvent(
    &accel,
    &gyro,
    &mpuTemp
  );

  accelX =
    accel.acceleration.x;

  accelY =
    accel.acceleration.y;

  accelZ =
    accel.acceleration.z;

  gyroX =
    gyro.gyro.x;

  gyroY =
    gyro.gyro.y;

  gyroZ =
    gyro.gyro.z;

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

  accelMagnitudeSum +=
    accelMagnitude;

  gyroMagnitudeSum +=
    gyroMagnitude;

  tiltSum +=
    tiltAngle;

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

  bool highMotion =
    (
      accelMagnitude >= FALL_ACCEL_THRESHOLD ||
      gyroMagnitude >= FALL_GYRO_THRESHOLD
    );

  if (
    highMotion
  )
  {
    if (
      fallCandidateTime == 0
    )
    {
      fallCandidateTime =
        millis();

      Serial.println();

      Serial.println(
        "WARNING: POSSIBLE HIGH-MOTION EVENT"
      );

      Serial.println(
        "Monitoring for post-event inactivity..."
      );
    }

    return;
  }

  if (
    fallCandidateTime > 0
  )
  {
    if (
      millis() -
      fallCandidateTime >=
      FALL_INACTIVITY_TIME
    )
    {
      fallEventDetected = true;

      Serial.println();

      Serial.println(
        "================================================"
      );

      Serial.println(
        "FALL / HIGH-MOTION EVENT FLAGGED"
      );

      Serial.println(
        "CONTINUOUS MODE ONLY"
      );

      Serial.println(
        "Event flag will be sent to backend."
      );

      Serial.println(
        "================================================"
      );

      fallCandidateTime = 0;
    }
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
    temp > -55.0 &&
    temp < 125.0
  )
  {
    temperatureC = temp;
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
    spO2CandidateStable() &&
    finalSpO2 >= 70 &&
    finalSpO2 <= 100
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
    finalValidatedHR <= 180 &&
    (
      CURRENT_MODE == CONTINUOUS_MODE
        ? latestValidatedHeartRate > 0
        : heartRateCandidateStable()
    )
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
    rrCount >= 3
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
    jsonHeartRate <= 180 &&
    (
      CURRENT_MODE == CONTINUOUS_MODE
        ? latestValidatedHeartRate > 0
        : heartRateCandidateStable()
    )
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
    rrCount >= 3
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
    temperatureSensorPresent
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
      "15"
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
    payloadHeartRate <= 180 &&
    (
      CURRENT_MODE == CONTINUOUS_MODE
        ? latestValidatedHeartRate > 0
        : heartRateCandidateStable()
    )
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
    rrCount >= 3
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
    temperatureSensorPresent
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
      "15";
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

  // Both modes expose recent REAL IR samples for the dashboard PPG waveform.
  if (CURRENT_MODE == CONTINUOUS_MODE || CURRENT_MODE == SPOT_MODE)
  {
    payload +=
      ",\"ppgWaveform\":[";

    byte snapshotCount;
    uint32_t ppgSnapshot[PPG_WAVEFORM_SIZE];

    portENTER_CRITICAL(&ppgMux);

    snapshotCount = ppgWaveformCount;

    for (
      byte i = 0;
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
      byte i = 0;
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
    ",\"temperature\":";

  if (
    temperatureSensorPresent
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
    ",\"testMode\":true";

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
