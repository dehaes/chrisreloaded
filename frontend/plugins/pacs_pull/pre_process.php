#!/usr/bin/php
<?php
/**
 *
 *            sSSs   .S    S.    .S_sSSs     .S    sSSs
 *           d%%SP  .SS    SS.  .SS~YS%%b   .SS   d%%SP
 *          d%S'    S%S    S%S  S%S   `S%b  S%S  d%S'
 *          S%S     S%S    S%S  S%S    S%S  S%S  S%|
 *          S&S     S%S SSSS%S  S%S    d* S  S&S  S&S
 *          S&S     S&S  SSS&S  S&S   .S* S  S&S  Y&Ss
 *          S&S     S&S    S&S  S&S_sdSSS   S&S  `S&&S
 *          S&S     S&S    S&S  S&S~YSY%b   S&S    `S*S
 *          S*b     S*S    S*S  S*S   `S%b  S*S     l*S
 *          S*S.    S*S    S*S  S*S    S%S  S*S    .S*P
 *           SSSbs  S*S    S*S  S*S    S&S  S*S  sSS*S
 *            YSSP  SSS    S*S  S*S    SSS  S*S  YSS'
 *                         SP   SP          SP
 *                         Y    Y           Y
 *
 *                     R  E  L  O  A  D  E  D
 *
 * (c) 2012 Fetal-Neonatal Neuroimaging & Developmental Science Center
 *                   Boston Children's Hospital
 *
 *              http://childrenshospital.org/FNNDSC/
 *                        dev@babyMRI.org
 *
 */

$user_id = '';
$feed_chris_id = '';
$details = '';

// get all information related to a patient
$pacs = new PACS(PACS_SERVER, PACS_PORT, PACS_AETITLE);
$study_parameter = Array();
$study_parameter['PatientID'] = $details;
$study_parameter['PatientName'] = '';
$study_parameter['PatientBirthDate'] = '';
$study_parameter['PatientSex'] = '';
$series_parameter = Array();
$series_parameter['SeriesDescription'] = '';
$series_parameter['NumberOfSeriesRelatedInstances'] = '';
$results = $pacs->queryAll($study_parameter, $series_parameter, null);

// if no data available, return null
if(count($results[1]) == 0)
{
  return "No data available from pacs for: MRN - ".$details;
}

// LOCK DB Patient on write so no patient will be added in the meanwhile
$db = DB::getInstance();
$db->lock('patient', 'WRITE');

// look for the patient
$patientMapper = new Mapper('Patient');
$patientMapper->filter('patient_id = (?)',$results[0]['PatientID'][0]);
$patientResult = $patientMapper->get();
$patient_chris_id = -1;
// create patient if doesn't exist
if(count($patientResult['Patient']) == 0)
{
  // create patient model
  $patientObject = new Patient();
  $patientObject->name = $results[0]['PatientName'][0];
  $date = $results[0]['PatientBirthDate'][0];
  $datetime =  substr($date, 0, 4).'-'.substr($date, 4, 2).'-'.substr($date, 6, 2);
  $patientObject->dob = $datetime;
  $patientObject->sex = $results[0]['PatientSex'][0];
  $patientObject->uid = $results[0]['PatientID'][0];
  // add the patient model and get its id
  $patient_chris_id = Mapper::add($patientObject);
}
// else get its id
else{
  $patient_chris_id = $patientResult['Patient'][0]->id;
}

// unlock patient table
$db->unlock();

// loop through all data to be downloaded
// if data not there, create row in the data db table
// update the feed ids and status

$data_chris_id = -1;
$feed_status = '';
foreach ($results[1]['SeriesInstanceUID'] as $key => $value){
  // lock data db so no data added in the meanwhile
  $db = DB::getInstance();
  $db->lock('data', 'WRITE');

  // retrieve the data
  $dataMapper = new Mapper('Data');
  $dataMapper->filter('uid = (?)',$value);
  $dataResult = $dataMapper->get();
  // if nothing in DB yet, add it
  if(count($dataResult['Data']) == 0)
  {
    // add data and get its id
    $dataObject = new Data();
    $dataObject->uid = $value;
    $dataObject->nb_files = $results[1]['NumberOfSeriesRelatedInstances'][$key];
    $dataObject->name = sanitize($results[1]['SeriesDescription'][$key]);
    $data_chris_id = Mapper::add($dataObject);

    // MAP DATA TO PATIENT
    $dataPatientObject = new Data_Patient();
    $dataPatientObject->data_id = $data_chris_id;
    $dataPatientObject->patient_id = $patient_chris_id;
    Mapper::add($dataPatientObject);
  }
  // else get its id
  else{
    $data_chris_id = = $dataResult['Data'][0]->id;
  }
  
  $db->unlock();
  
  // MAP DATA TO FEED
  $feedDataObject = new Feed_Data();
  $feedDataObject->feed_id = $feed_chris_id;
  $feedDataObject->data_id = $data_chris_id;
  Mapper::add($feedDataObject);
}
?>