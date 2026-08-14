<?php
/**
 * Plugin Name: Feeling Yachty Fleet Chatbot
 * Plugin URI:  https://feelingyachty.com/
 * Description: Website chat widget that recommends live yachts from Feeling Yachty Suite 3.65.0 (fy/v1 fleet API). Never invents names or prices.
 * Version:     1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Author:      Feeling Yachty
 * Author URI:  https://feelingyachty.com/
 * License:     GPL-2.0-or-later
 * Text Domain: feeling-yachty-chatbot
 *
 * @package FeelingYachtyChatbot
 */

defined( 'ABSPATH' ) || exit;

define( 'FY_CHATBOT_VERSION', '1.0.0' );
define( 'FY_CHATBOT_SUITE_MIN', '3.65.0' );
define( 'FY_CHATBOT_FILE', __FILE__ );
define( 'FY_CHATBOT_DIR', plugin_dir_path( __FILE__ ) );
define( 'FY_CHATBOT_URL', plugin_dir_url( __FILE__ ) );

require_once FY_CHATBOT_DIR . 'includes/class-fleet-client.php';
require_once FY_CHATBOT_DIR . 'includes/class-intent-parser.php';
require_once FY_CHATBOT_DIR . 'includes/class-chat-engine.php';
require_once FY_CHATBOT_DIR . 'includes/class-rest.php';
require_once FY_CHATBOT_DIR . 'includes/class-admin.php';
require_once FY_CHATBOT_DIR . 'includes/class-plugin.php';

add_action(
	'plugins_loaded',
	static function () {
		FY_Chatbot_Plugin::instance()->boot();
	}
);
