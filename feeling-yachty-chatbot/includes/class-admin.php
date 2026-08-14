<?php
/**
 * Settings: phone, greeting, optional n8n webhook.
 *
 * @package FeelingYachtyChatbot
 */

defined( 'ABSPATH' ) || exit;

class FY_Chatbot_Admin {

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'settings' ) );
		add_action( 'admin_notices', array( $this, 'suite_notice' ) );
	}

	public function menu(): void {
		add_options_page(
			'Feeling Yachty Chatbot',
			'FY Fleet Chatbot',
			'manage_options',
			'fy-fleet-chatbot',
			array( $this, 'render' )
		);
	}

	public function settings(): void {
		register_setting(
			'fy_chatbot',
			'fy_chatbot_phone',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '+1-754-325-3827',
			)
		);
		register_setting(
			'fy_chatbot',
			'fy_chatbot_greeting',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
				'default'           => 'Hi! So glad you reached out to Feeling Yachty. I’d love to help make this easy.',
			)
		);
		register_setting(
			'fy_chatbot',
			'fy_chatbot_n8n_webhook',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'esc_url_raw',
				'default'           => '',
			)
		);
		register_setting(
			'fy_chatbot',
			'fy_chatbot_enabled',
			array(
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'default'           => true,
			)
		);
	}

	public function suite_notice(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || $screen->id !== 'settings_page_fy-fleet-chatbot' ) {
			return;
		}
		if ( $this->suite_plugin_active() ) {
			return;
		}
		echo '<div class="notice notice-warning"><p>';
		echo esc_html__( 'Feeling Yachty Fleet Chatbot reads live boats from feeling-yachty-suite 3.65.0 (REST namespace fy/v1). Activate that fleet plugin on this site, or the widget will have nothing to quote.', 'feeling-yachty-chatbot' );
		echo '</p></div>';
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1>Feeling Yachty Fleet Chatbot</h1>
			<p>Quotes only live yachts from <code>feeling-yachty-suite</code> 3.65.0 via <code>/wp-json/fy/v1</code>. It will not invent names or prices.</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'fy_chatbot' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="fy_chatbot_enabled">Show widget</label></th>
						<td>
							<label>
								<input type="checkbox" name="fy_chatbot_enabled" value="1" <?php checked( get_option( 'fy_chatbot_enabled', true ) ); ?> />
								Load the chat bubble on the public site
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="fy_chatbot_phone">Sales / SMS handoff</label></th>
						<td>
							<input class="regular-text" type="text" id="fy_chatbot_phone" name="fy_chatbot_phone" value="<?php echo esc_attr( (string) get_option( 'fy_chatbot_phone', '+1-754-325-3827' ) ); ?>" />
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="fy_chatbot_greeting">Greeting</label></th>
						<td>
							<textarea class="large-text" rows="3" id="fy_chatbot_greeting" name="fy_chatbot_greeting"><?php echo esc_textarea( (string) get_option( 'fy_chatbot_greeting', 'Hi! So glad you reached out to Feeling Yachty. I’d love to help make this easy.' ) ); ?></textarea>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="fy_chatbot_n8n_webhook">Optional n8n webhook</label></th>
						<td>
							<input class="large-text" type="url" id="fy_chatbot_n8n_webhook" name="fy_chatbot_n8n_webhook" value="<?php echo esc_attr( (string) get_option( 'fy_chatbot_n8n_webhook', '' ) ); ?>" placeholder="https://…/webhook/…" />
							<p class="description">If set, messages are sent to Mom Bot / Support Receptionist. Fleet cards still come from Suite 3.65.0.</p>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>
			<p>Shortcode: <code>[fy_fleet_chat]</code></p>
		</div>
		<?php
	}

	private function suite_plugin_active(): bool {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$candidates = array(
			'feeling-yachty-suite/feeling-yachty-suite.php',
			'feeling-yachty-suite-3.65.0/feeling-yachty-suite.php',
		);
		foreach ( $candidates as $file ) {
			if ( is_plugin_active( $file ) ) {
				return true;
			}
		}
		return false;
	}
}
