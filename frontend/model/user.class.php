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
if (!defined('__CHRIS_ENTRY_POINT__'))
  die('Invalid access.');

// grab the super class for all entities
require_once 'object.class.php';

/**
 *
 * The User class which describes the User entity of the database.
 *
 */
class User extends Object {

  /**
   * The user name.
   *
   * @var string $username
   */
  public $username = null;

  /**
   * The encrypted password.
   *
   * @var string $password
   */
  public $password = null;
  
  /**
   * The email of the user.
   *
   * @var string $email
   */
  public $email = null;
  
  /**
   * Extra information about the user.
   * background, privacy settings, etc.
   *
   * @var string $meta_information
   */
  public $meta_information = null;
}
?>