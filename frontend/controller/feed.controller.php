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
// prevent direct calls
if (!defined('__CHRIS_ENTRY_POINT__')) die('Invalid access.');

// include the configuration
require_once ($_SERVER['DOCUMENT_ROOT_NICOLAS'].'/config.inc.php');


require_once (joinPaths(CHRIS_CONTROLLER_FOLDER, '_session.inc.php'));

require_once (joinPaths(CHRIS_CONTROLLER_FOLDER, 'pacs.class.php'));

// include the models
require_once (joinPaths(CHRIS_VIEW_FOLDER, 'feed.view.php'));
require_once (joinPaths(CHRIS_MODEL_FOLDER, 'feed.model.php'));
require_once (joinPaths(CHRIS_MODEL_FOLDER, 'user.model.php'));
require_once (joinPaths(CHRIS_MODEL_FOLDER, 'data.model.php'));

// interface
interface FeedControllerInterface
{
  // get HTML representation of the feed
  static public function getHTML($nb_feeds);
  static public function update();

  static public function add(&$object);
  static public function updateDB(&$object, $data_id);
}

/**
 * Feed controller class
 */
class FeedC implements FeedControllerInterface {

  static public function getHTML($nb_feeds){
    $feed_content = '';
    $i = 0;

    // get feed objects
    $feedMapper = new Mapper('Feed');
    $feedMapper->filter('status = (?)','0');
    $feedMapper->order('id');
    $feedResult = $feedMapper->get();

    if(count($feedResult['Feed']) >= 1){

      $_SESSION['feed_id'] = $feedResult['Feed'][0]->id;

      // for each
      foreach ($feedResult['Feed'] as $key => $value) {
        if($i >= $nb_feeds){
          break;
        }
        $view = new FeedV($value);
        $feed_content .= $view->getHTML();
        $i++;
      }
    }
    else{
      $feed_content .= 'No feed found.';
    }
    return $feed_content;
  }

  static public function update(){
    $feed_id = $_SESSION['feed_id'];
    $feed_content = '';

    // get feed objects which are ready
    $feedMapper = new Mapper('Feed');
    $feedMapper->filter('status = (?)','0');
    $feedMapper->order('id');
    $feedResult = $feedMapper->get();

    if(count($feedResult['Feed']) >= 1 && $feedResult['Feed'][0]->id > $feed_id){
      $old_id = $feed_id;
      $_SESSION['feed_id'] = $feedResult['Feed'][0]->id;
      // for each
      foreach ($feedResult['Feed'] as $key => $value) {
        if($value->id <= $old_id){
          break;
        }
        $view = new FeedV($value);
        $feed_content .= $view->getHTML();
      }
    }

    echo $feed_content;
  }

  static public function add(&$object){
    FeedC::_format($object);
    return Mapper::add($object);
  }

  static private function _format(&$object){
    // if name is not a number, get the matching id
    if(! is_numeric($object->user_id)){
      $userMapper = new Mapper('User');
      // retrieve the data
      $userMapper->filter('username = (?)',$object->user_id);
      $userResult = $userMapper->get();

      // if nothing in DB yet, return null
      if(count($userResult['User']) == 0)
      {
        return null;
      }
      $object->user_id = $userResult['User'][0]->id;
    }

    // if special action, model has to be updated
    switch ($object->action){
      case 'data-down-mrn':
        $pacs = new PACS(PACS_SERVER, PACS_PORT, CHRIS_AETITLE);
        $study_parameter = Array();
        $study_parameter['PatientID'] = $object->model_id;
        $series_parameter = Array();
        $series_parameter['NumberOfSeriesRelatedInstances'] = '';
        $all_results = $pacs->queryAll($study_parameter, $series_parameter, null);
        // if no data available, return null
        if(count($all_results[1]) == 0)
        {
          return null;
        }

        $object->model_id = '';
        $object->status = '';
        // update ids and status
        foreach ($all_results[1]['SeriesInstanceUID'] as $key => $value){
          $object->model_id .= $value . ';';
          $object->status .= '0';
        }

        // modify action
        $object->action = 'data-down';
        break;
      default:
        break;
    }

  }

  static public function updateDB(&$object, $data_id){
    // if feed contains this data id
    $ids = explode(';', $object->model_id);
    $location = array_search($data_id, $ids);
    if($location){
      $status_array = str_split($object->status);
      $status_array[$location] = '0';
      $object->status = implode('', $status_array);
      if(intval($object->status) == 0){
        // delete previous object
        Mapper::delete('Feed', $object->id);
        // create new object
        Mapper::add($object);
      }
      else{
        Mapper::update($object, $object->id);
      }
    }

  }
}
?>