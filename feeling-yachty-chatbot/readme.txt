=== Feeling Yachty Fleet Chatbot ===
Contributors: feelingyachty
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later

Website chat widget that recommends live yachts from Feeling Yachty Suite 3.65.0.

== Description ==

This is the WordPress chatbot for Feeling Yachty. It does **not** replace the fleet plugin.

The fleet plugin is **feeling-yachty-suite 3.65.0**. This chatbot reads that plugin’s public REST API:

* `GET /wp-json/fy/v1/yachts`
* `GET /wp-json/fy/v1/fleets`
* `GET /wp-json/fy/v1/fleets/{slug}/yachts`

It never invents a yacht name or price. Optional n8n webhook can sit in front (Mom Bot / Support Receptionist); fleet cards still come from Suite 3.65.0.

== Installation ==

1. Keep `feeling-yachty-suite` 3.65.0 (or newer) active on the same WordPress site.
2. Upload this plugin folder to `wp-content/plugins/feeling-yachty-chatbot`.
3. Activate **Feeling Yachty Fleet Chatbot**.
4. Settings → FY Fleet Chatbot.

Shortcode: `[fy_fleet_chat]`

== Changelog ==

= 1.0.0 =
* First release. Live matching against Feeling Yachty Suite 3.65.0 fy/v1.
