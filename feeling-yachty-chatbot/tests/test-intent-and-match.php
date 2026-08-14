<?php
/**
 * CLI tests for intent parsing and Suite 3.65.0 fleet matching.
 *
 * Run: php feeling-yachty-chatbot/tests/test-intent-and-match.php
 */

require_once __DIR__ . '/bootstrap.php';

$failed = 0;

function fy_assert( bool $ok, string $label ): void {
	global $failed;
	if ( $ok ) {
		echo "ok  {$label}\n";
		return;
	}
	$failed++;
	echo "FAIL {$label}\n";
}

$parser = new FY_Chatbot_Intent_Parser();

$miami = $parser->parse( 'Hi, looking for a pink yacht in Miami for 10 guests, 4 hours' );
fy_assert( $miami['city'] === 'miami', 'detects Miami' );
fy_assert( $miami['lang'] === 'en', 'detects English' );
fy_assert( $miami['pink'] === true, 'detects pink' );
fy_assert( (int) $miami['guests'] === 10, 'detects 10 guests' );
fy_assert( (float) $miami['hours'] === 4.0, 'detects 4 hours' );

$panama = $parser->parse( 'Hola, quiero un yate en Panamá para 8 personas' );
fy_assert( $panama['city'] === 'panama', 'detects Panama' );
fy_assert( $panama['lang'] === 'es', 'detects Spanish' );
fy_assert( (int) $panama['guests'] === 8, 'detects 8 invitados' );

$handoff = $parser->parse( 'send me options please', array( 'city' => 'miami' ) );
fy_assert( $handoff['handoff'] === true, 'handoff on send me options' );
fy_assert( $handoff['city'] === 'miami', 'keeps prior city' );

$yachts = array(
	array(
		'id'            => 1,
		'status'        => 'publish',
		'title'         => '50ft Pink Horizon',
		'brand'         => 'Horizon',
		'model'         => 'Pink',
		'size_ft'       => 50,
		'capacity_max'  => 13,
		'is_pink'       => true,
		'is_free_hour'  => false,
		'price'         => 400,
		'duration_label'=> '3 Hours',
		'categories'    => array( 'miami-yacht-rental' ),
		'tags'          => array( 'pink' ),
		'pricing'       => array(
			array( 'type' => 'price', 'duration' => '3 Hours', 'price' => 1250 ),
			array( 'type' => 'price', 'duration' => '4 Hours', 'price' => 1500 ),
		),
		'product_url'   => 'https://feelingyachty.com/fleet/miami/50ft-pink-horizon/',
	),
	array(
		'id'           => 2,
		'status'       => 'publish',
		'title'        => 'Pontoon',
		'size_ft'      => 20,
		'capacity_max' => 6,
		'is_pink'      => false,
		'price'        => 120,
		'categories'   => array( 'miami-yacht-rental' ),
		'pricing'      => array(
			array( 'type' => 'price', 'duration' => '4 Hours', 'price' => 480 ),
		),
	),
	array(
		'id'           => 3,
		'status'       => 'publish',
		'title'        => 'Big Daddy',
		'size_ft'      => 60,
		'capacity_max' => 12,
		'is_pink'      => false,
		'price'        => 900,
		'categories'   => array( 'panama-yacht-rentals' ),
	),
);

$fleet = new class() extends FY_Chatbot_Fleet_Client {
	public function yachts( string $fleet = '' ): array {
		return array();
	}
	public function fleets(): array {
		return array();
	}
	public function suite_available(): bool {
		return true;
	}
};

$engine = new FY_Chatbot_Engine( $fleet, $parser );

$pink = $engine->match( $yachts, $miami );
fy_assert( count( $pink ) === 1 && $pink[0]['id'] === 1, 'pink + 10 guests keeps Horizon, drops pontoon' );
fy_assert( $engine->price_for_hours( $yachts[0], 4 ) === 1500.0, 'uses Suite pricing row for 4 hours' );
fy_assert( $engine->price_for_hours( $yachts[0], 3 ) === 1250.0, 'uses Suite pricing row for 3 hours' );

$pan_match = $engine->match( $yachts, $panama );
fy_assert( count( $pan_match ) === 1 && $pan_match[0]['id'] === 3, 'Panama city filter excludes Miami boats' );

$too_many = $engine->match( $yachts, array( 'city' => 'miami', 'guests' => 20, 'query' => '' ) );
fy_assert( $too_many === array(), 'drops boats under guest capacity' );

if ( $failed > 0 ) {
	echo "\n{$failed} failed\n";
	exit( 1 );
}

echo "\nall passed\n";
exit( 0 );
