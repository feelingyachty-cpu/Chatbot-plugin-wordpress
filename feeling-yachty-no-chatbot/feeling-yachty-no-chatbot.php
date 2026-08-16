<?php
/**
 * Plugin Name: Feeling Yachty — No Chatbot
 * Description: Hides the Suite Support Bot. GoHighLevel owns SMS, WhatsApp, email, and calls. Safe to keep installed.
 * Version: 1.0.0
 * Author: Feeling Yachty
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'admin_menu',
	static function () {
		remove_submenu_page( 'edit.php?post_type=fy_yacht', 'fy-support-bot' );
		remove_menu_page( 'fy-support-bot' );
	},
	999
);

add_action(
	'wp_enqueue_scripts',
	static function () {
		wp_dequeue_script( 'fy-support-bot' );
		wp_dequeue_style( 'fy-support-bot' );
		wp_deregister_script( 'fy-support-bot' );
		wp_deregister_style( 'fy-support-bot' );
	},
	100
);

add_action(
	'admin_enqueue_scripts',
	static function () {
		wp_dequeue_script( 'fy-support-bot' );
		wp_dequeue_style( 'fy-support-bot' );
	},
	100
);
