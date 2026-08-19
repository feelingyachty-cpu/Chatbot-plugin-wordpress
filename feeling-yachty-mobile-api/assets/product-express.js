/* Patched copy of Suite 3.73.4 product-express.js.
 * Dock = boat − today’s payment (crew + fuel + reservation).
 * Coco 4 hours: $1,140 − $700 = $440. Stock Suite still prints $1,140. */
/* Feeling Yachty — show express checkout on product pages only after the
   booking is fully specified (date + start time + duration/passengers).
   Until then customers see just the Book Experience button. */
jQuery( function ( $ ) {
	var $form = $( 'form.cart' );
	if ( ! $form.length ) {
		return;
	}

	function bookingReady() {
		var date = $( '#booking_date' ).val();
		var time = $( '#charter_start_time' ).val();
		var variation = $form.find( '[name="variation_id"]' ).val();
		// Non-variable products have no variation_id input — treat as chosen.
		var variationOk = $form.find( '[name="variation_id"]' ).length ? ( variation && '0' !== variation ) : true;
		return !! ( date && time && variationOk );
	}

	// Highlight each booking field in brand purple + a checkmark the moment
	// it holds a real value — visible confirmation, not just focus outline.
	function markFilled( $field ) {
		var v = $field.val();
		$field.toggleClass( 'fy-field-filled', !! ( v && '0' !== v ) );
	}

	function markAllFilled() {
		markFilled( $( '#booking_date' ) );
		markFilled( $( '#charter_start_time' ) );
		$form.find( 'table.variations select' ).each( function () {
			markFilled( $( this ) );
		} );
	}

	function toggle() {
		document.body.classList.toggle( 'fy-express-ready', bookingReady() );
		markAllFilled();
	}

	$( document.body ).on( 'change input', '#booking_date, #charter_start_time', toggle );
	$form.on( 'found_variation hide_variation reset_data change', function () {
		setTimeout( toggle, 60 );
	} );
	// Datepickers often write the field without firing events — poll cheaply.
	setInterval( toggle, 1200 );
	toggle();
} );

/* Product-page performance and clarity extras. */
jQuery( function ( $ ) {
	if ( ! document.body.classList.contains( 'single-product' ) ) {
		return;
	}

	// ---- 1. Lazy-load gallery thumbnails (30+ images per yacht) ----
	// WooCommerce builds .flex-control-thumbs via its own gallery script,
	// which runs AFTER this file's ready handler — tagging immediately finds
	// nothing. Watch the DOM instead so thumbnails are caught whenever the
	// gallery actually inserts them (verified live: this was silently a
	// no-op before, 2026-08-08).
	function tagLazyThumbs() {
		$( '.flex-control-thumbs img' ).each( function ( i ) {
			if ( i > 3 && ! this.getAttribute( 'loading' ) ) {
				this.setAttribute( 'loading', 'lazy' );
				this.setAttribute( 'decoding', 'async' );
			}
		} );
	}
	tagLazyThumbs();
	if ( 'MutationObserver' in window ) {
		var galleryEl = document.querySelector( '.woocommerce-product-gallery' ) || document.body;
		new MutationObserver( tagLazyThumbs ).observe( galleryEl, { childList: true, subtree: true } );
	}

	// ---- 1b. De-duplicate the Charter Start Time placeholder ----
	// That field's own code (not part of this plugin) hardcodes "Select
	// Charter Start Time" as its empty option, so with the "Charter Start
	// Time" label above it the field visibly repeats itself. The other two
	// fields (Duration, Passenger Count) use "Choose an option" — match that.
	var $timeField = $( '#charter_start_time' );
	if ( $timeField.length ) {
		$timeField.find( 'option[value=""]' ).text( 'Choose an option' );
	}

	/* ---- 1c. Start times: 6am–2am only, and nothing already past today ----
	 * The time list comes from a theme snippet, so it is filtered here rather
	 * than at its source. Two rules:
	 *   - Charters run 6:00 AM through 2:00 AM. Anything outside that window
	 *     is removed outright.
	 *   - If the chosen date is TODAY in Miami, a slot whose time has already
	 *     gone is disabled with a plain explanation, instead of failing later
	 *     at checkout. "Today" is Miami's date, not the visitor's: someone
	 *     booking from London at 3am sees Miami's clock, which is the one the
	 *     boat actually leaves on.
	 */
	var OPEN_MIN  = 6 * 60;   // 06:00
	var CLOSE_MIN = 2 * 60;   // 02:00 next day

	function miamiParts() {
		// en-CA gives YYYY-MM-DD; hour12:false gives a 24h clock.
		var d = new Date();
		var date = new Intl.DateTimeFormat( 'en-CA', {
			timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
		} ).format( d );
		var time = new Intl.DateTimeFormat( 'en-GB', {
			timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false
		} ).format( d );
		var bits = time.split( ':' );
		return { date: date, minutes: parseInt( bits[ 0 ], 10 ) * 60 + parseInt( bits[ 1 ], 10 ) };
	}

	/** Minutes past midnight for an option label like "3:30 pm", or null. */
	function optionMinutes( text ) {
		var m = String( text ).match( /(\d{1,2})\s*:\s*(\d{2})\s*([ap])\.?\s*m\.?/i );
		if ( ! m ) { return null; }
		var h = parseInt( m[ 1 ], 10 ) % 12;
		if ( /p/i.test( m[ 3 ] ) ) { h += 12; }
		return h * 60 + parseInt( m[ 2 ], 10 );
	}

	function isWithinHours( mins ) {
		return mins >= OPEN_MIN || mins <= CLOSE_MIN;
	}

	function applyTimeRules() {
		var $sel = $( '#charter_start_time' );
		if ( ! $sel.length ) { return; }

		// Trim to opening hours once — these options never come back.
		$sel.find( 'option' ).each( function () {
			var v = $( this ).attr( 'value' );
			if ( ! v ) { return; }
			var mins = optionMinutes( $( this ).text() );
			if ( null !== mins && ! isWithinHours( mins ) ) { $( this ).remove(); }
		} );

		var now      = miamiParts();
		var isToday  = ( $( '#booking_date' ).val() || '' ).slice( 0, 10 ) === now.date;
		var anyPast  = false;

		$sel.find( 'option' ).each( function () {
			var $o = $( this );
			if ( ! $o.attr( 'value' ) ) { return; }
			var mins = optionMinutes( $o.text() );
			if ( null === mins ) { return; }
			// After-midnight slots (12am–2am) belong to the following morning,
			// so they are never "already gone" for a booking made today.
			var past = isToday && mins >= OPEN_MIN && mins < now.minutes;
			$o.prop( 'disabled', past );
			if ( past ) { anyPast = true; }
		} );

		// A slot picked before the date changed to today may now be in the past.
		var $chosen = $sel.find( 'option:selected' );
		if ( $chosen.length && $chosen.prop( 'disabled' ) ) {
			$sel.val( '' ).trigger( 'change' );
		}

		var $note = $( '.fy-time-past-note' );
		if ( isToday && anyPast ) {
			if ( ! $note.length ) {
				$note = $( '<div class="fy-time-past-note"></div>' );
				fullRowFor( $sel ).after( $note );
			}
			$note.text( 'Times earlier than right now are greyed out for today — pick a later start, or choose another date.' ).show();
		} else if ( $note.length ) {
			$note.hide();
		}
	}

	// Re-apply whenever the date changes, and on a slow poll for date pickers
	// that set the field without firing an event.
	$( document.body ).on( 'change input', '#booking_date', applyTimeRules );
	applyTimeRules();
	setInterval( applyTimeRules, 5000 );

	// ---- 2. Native date picker on phones ----
	// The jQuery UI calendar is fiddly on touch screens; the phone's own
	// date wheel is faster. Desktop keeps the styled calendar.
	var $date = $( '#booking_date' );
	if ( $date.length && window.matchMedia( '(max-width: 767px)' ).matches ) {
		if ( $date.hasClass( 'hasDatepicker' ) && $.fn.datepicker ) {
			$date.datepicker( 'destroy' );
		}
		// Miami's date, not the device's UTC date via toISOString(): between
		// 8pm and midnight Eastern that had already rolled to tomorrow,
		// which blocked the native picker from offering "today" late at
		// night even while applyTimeRules() below was still selling slots.
		$date.attr( {
			type: 'date',
			min: miamiParts().date,
			placeholder: 'YYYY-MM-DD'
		} );
	}

	// ---- 3. Live "what you'll pay" summary above the button ----
	var $form = $( 'form.cart' );
	if ( ! $form.length ) {
		return;
	}

	var $summary = $( '<div class="fy-pay-summary" aria-live="polite"></div>' );
	$form.find( '.woocommerce-variation-add-to-cart' ).before( $summary );

	// Always visible, regardless of what's been selected yet — this is
	// general guidance, not tied to a specific booking's details. Sits right
	// under the "Due today" card, above the "Why only a deposit?" dropdown.
	if ( ! $( '.fy-confirm-note' ).length ) {
		$summary.after(
			'<div class="fy-confirm-note">Please confirm your yacht, date and time with our team before paying. ' +
			'<a href="https://feelingyachty.com/miami-yacht-charters/">View Miami Yacht Charter Fleet.</a></div>'
		);
	}

	/**
	 * The Charter Start Time field is built by a theme snippet, not this
	 * plugin, and that snippet wraps it in a flex ROW (label + field side by
	 * side) — the same row the field's own container sits in. Inserting
	 * .after() the field's immediate parent lands INSIDE that row, so it
	 * rendered as a second flex column beside the field instead of a line
	 * underneath it. Walk up to the row itself — the first flex/grid
	 * ancestor — so the note becomes the row's next full-width sibling.
	 */
	function fullRowFor( $field ) {
		var el = $field.length ? $field[ 0 ] : null;
		while ( el && el.parentElement && 'FORM' !== el.tagName ) {
			el = el.parentElement;
			var d = window.getComputedStyle( el ).display;
			if ( 'flex' === d || 'grid' === d || 'table-row' === d ) {
				return $( el );
			}
		}
		return $field.closest( 'p, .form-row, td, div' );
	}

	// Arrival note — placed right under the start-time row, so it's read at
	// the exact moment a departure time is being chosen. Falls back to the
	// summary card if the theme hides that field.
	if ( ! $( '.fy-arrival-note' ).length ) {
		var $arrival = $(
			'<div class="fy-arrival-note">⏰ Please arrive 30 minutes before departure to check in and sign the ' +
			'charter agreement — charters run back-to-back, so arriving early protects your full time on the water.</div>'
		);
		var $timeRow = fullRowFor( $( '#charter_start_time' ) );
		if ( $timeRow.length ) {
			$timeRow.after( $arrival );
		} else {
			$summary.before( $arrival );
		}
	}

	function money( n ) {
		return '$' + Number( n ).toLocaleString( 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 } );
	}

	// Base/default deposit shown from page load, before any field is picked
	// — read straight off the (now hidden) price widget so it's never a
	// hardcoded guess. Once a specific duration is chosen, the real
	// variation price takes over.
	function parsePrice( text ) {
		var m = /([\d,]+(\.\d+)?)/.exec( text || '' );
		return m ? parseFloat( m[ 1 ].replace( /,/g, '' ) ) : 0;
	}
	var defaultDeposit = parsePrice( $( '.elementor-widget-woocommerce-product-price .price' ).first().text() );

	// Per-hour pricing model: Booking = this yacht's own hourly rate × hours
	// (the same math as the 3-8 Hour Price columns in the fleet spreadsheet),
	// plus Crew and Fuel, each charged per hour (Settings → Checkout &
	// Integrations → Per-Hour Charter Charges, overridable per yacht).
	// Localized via wp_localize_script; fall back to 0s if missing.
	var charges = ( typeof fyCharges !== 'undefined' ) ? fyCharges : { hourlyRate: 0, crewRate: 0, fuelRate: 0, serviceFee: 0 };

	/** Leading number in a duration label like "3 Hours" or "3.5 Hours" → 3 / 3.5. */
	function parseHours( text ) {
		var m = /([\d.]+)/.exec( text || '' );
		return m ? parseFloat( m[ 1 ] ) : 0;
	}

	// Add-on totals, kept in sync by assets/addons.js via the
	// "fy_addons_changed" event it fires whenever a box is ticked or the
	// jet-ski hours change. Zero when the add-ons block isn't present.
	var addonsTotal = 0;
	var addonsNow   = 0;
	var addonsLines = [];

	function formatDate( iso ) {
		if ( ! iso ) {
			return '';
		}
		var d = new Date( iso + 'T00:00:00' );
		if ( isNaN( d.getTime() ) ) {
			return iso;
		}
		return d.toLocaleDateString( 'en-US', { month: 'short', day: 'numeric', year: 'numeric' } );
	}

	// Always visible from page load — fills in with chips as the customer
	// picks each field, and the deposit total appears once duration is
	// chosen too (price depends on it).
	function renderSummary() {
		var dateVal = $( '#booking_date' ).val();
		var timeText = $( '#charter_start_time option:selected' ).text();
		var hours = $( '#pa_charter-duration option:selected' ).text();
		var guests = $( '#pa_passenger-count' ).val();
		var deposit = lastVariation && lastVariation.display_price ? Number( lastVariation.display_price ) : defaultDeposit;

		var hasDate = !! dateVal;
		var hasTime = !! ( timeText && timeText.indexOf( 'Choose' ) === -1 );
		var hasHours = !! ( hours && hours.indexOf( 'Choose' ) === -1 );
		var hasGuests = !! guests;
		var hasAny = hasDate || hasTime || hasHours || hasGuests;

		var html = '';
		if ( hasAny ) {
			html += '<div class="fy-pay-summary__row">';
			if ( hasDate ) {
				html += '<span class="fy-pay-chip">📅 ' + $( '<i>' ).text( formatDate( dateVal ) ).html() + '</span>';
			}
			if ( hasTime ) {
				html += '<span class="fy-pay-chip">🕐 ' + $( '<i>' ).text( timeText ).html() + '</span>';
			}
			if ( hasHours ) {
				html += '<span class="fy-pay-chip">⏱ ' + $( '<i>' ).text( hours ).html() + '</span>';
			}
			if ( hasGuests ) {
				html += '<span class="fy-pay-chip">👥 ' + $( '<i>' ).text( guests ).html() + ' guests</span>';
			}
			html += '</div>';
		}
		// Payment model: ONLY crew + fuel is charged online now, for exactly
		// the hours picked — the boat/booking cost itself is the balance,
		// paid in person at the dock. No service fee in this calculation.
		// Add-ons split separately (see addonsTotal / addonsNow below).
		// Must match FY_Fleet_Pricing::quote()'s "crew_fuel" deposit math,
		// and the real price WooCommerce charges via the product's Charter
		// Duration variation (see FY_Fleet_Woo::sync_variations()).
		var chargedNow = 0;
		var dueAtDock  = 0;
		// The real row for the picked duration, keyed the same way
		// FY_Fleet_Woo::sync_variations() keyed the WooCommerce variation it
		// actually charges. Read directly from it rather than re-deriving
		// hours/price from the label text or from hourlyRate * hours: on a
		// yacht where _fy_price is a flat/package price rather than a true
		// hourly rate, that recompute overstates the boat cost (and the
		// reservation deposit taken from it).
		//
		// A yacht with day-of-week price groups (Mon–Fri vs Sat–Sun) can
		// reuse the same duration label at two different prices, which this
		// lookup can't tell apart — sync_variations() builds a variation per
		// PRICING ROW, so a duplicate label becomes two variations sharing
		// one attribute value. This row is only ever used as an instant
		// best-effort estimate for that rare case; a few lines down, the
		// real WooCommerce variation object (once WooCommerce itself has
		// resolved it) always overrides it for the number actually charged.
		var rows       = ( charges.pricingRows && typeof charges.pricingRows === 'object' ) ? charges.pricingRows : {};
		var durationVal = $( '#pa_charter-duration' ).val();
		var row         = ( durationVal && rows[ durationVal ] ) ? rows[ durationVal ] : null;
		// Only trust lastVariation if it's actually the variation for the
		// duration on screen right now — "change" on #pa_charter-duration
		// re-renders immediately, before WooCommerce's own variation-form
		// script has necessarily reacted and fired found_variation, so a
		// stale lastVariation from the PREVIOUS duration must not be used.
		var freshVariation = ( lastVariation && lastVariation.attributes &&
			lastVariation.attributes[ 'attribute_pa_charter-duration' ] === durationVal )
			? lastVariation : null;
		if ( hasHours && ( row || freshVariation || charges.hourlyRate > 0 ) ) {
			var boatHours     = row ? Number( row.hours ) : parseHours( hours );
			var bookingTotal  = row ? Number( row.price ) : Math.round( charges.hourlyRate * boatHours * 100 ) / 100;
			var crewTotal     = Math.round( charges.crewRate * boatHours * 100 ) / 100;
			var fuelTotal     = Math.round( charges.fuelRate * boatHours * 100 ) / 100;
			// Reservation deposit: bookings whose boat cost tops the threshold
			// ($1,400 default) also pay a percentage of it online —
			// non-refundable, credited in full against the dock balance.
			// Mirrors FY_Fleet_Woo::sync_variations(), which actually charges it.
			var depThr = Number( charges.depositThreshold ) || 0;
			var depPct = Number( charges.depositPct ) || 0;
			var resDep = ( depThr > 0 && depPct > 0 && bookingTotal > depThr )
				? Math.round( bookingTotal * depPct ) / 100
				: 0;
			chargedNow = Math.round( ( crewTotal + fuelTotal + resDep + addonsNow ) * 100 ) / 100;
			// Today's payment (crew + fuel + reservation + extras now) comes
			// off the boat. Coco 4h at $50/hr fuel: $1,140 − $600 = $540.
			dueAtDock  = Math.round( ( Math.max( 0, bookingTotal - fuelTotal - resDep ) + ( addonsTotal - addonsNow ) ) * 100 ) / 100;

			// The ground truth: whatever WooCommerce itself resolved this
			// exact variation's price to is what checkout will actually
			// charge (crew + fuel + reservation deposit, per
			// FY_Fleet_Woo::sync_variations()). Reconcile the two summary
			// numbers that reach the customer's card — chargedNow and the
			// deposit line — to it directly, so nothing shown here can ever
			// disagree with the real charge, even on an ambiguous yacht.
			if ( freshVariation && freshVariation.display_price !== undefined ) {
				var wooCharged = Number( freshVariation.display_price );
				resDep         = Math.max( 0, Math.round( ( wooCharged - crewTotal - fuelTotal ) * 100 ) / 100 );
				chargedNow     = Math.round( ( wooCharged + addonsNow ) * 100 ) / 100;
				// bookingTotal/dueAtDock must be rebuilt from THIS resDep,
				// not just when there was no row estimate at all — a row
				// guess that picked the wrong duplicate-slug duration (see
				// FY_Fleet_Pricing::rows_by_duration_slug()) is exactly as
				// stale as no guess, and leaving it in place printed
				// "Booking / Crew / Fuel / deposit" lines that no longer
				// summed to "Charged today" once resDep was corrected above.
				if ( resDep > 0 && depPct > 0 ) {
					// Invert the deposit back to the boat cost that produced
					// it — more authoritative than any estimate, row-based
					// or not, because it's derived from the real charge.
					bookingTotal = Math.round( ( resDep / depPct * 100 ) * 100 ) / 100;
				}
				dueAtDock = Math.round( ( Math.max( 0, bookingTotal - fuelTotal - resDep ) + ( addonsTotal - addonsNow ) ) * 100 ) / 100;
			}

			// row's price is a flat total for the chosen duration, not a
			// per-hour rate — only claim "$X/hr" when it truly is one.
			var bookingLabel = row
				? 'Booking (' + boatHours + ' Hours)'
				: 'Booking (' + money( charges.hourlyRate ) + '/hr &times; ' + boatHours + ' hrs)';
			html += '<div class="fy-pay-summary__breakdown">';
			html += '<div class="fy-pay-summary__line"><span>' + bookingLabel + '</span><span>' + money( bookingTotal ) + '</span></div>';
			if ( charges.crewRate > 0 ) {
				html += '<div class="fy-pay-summary__line"><span>Crew (' + money( charges.crewRate ) + '/hr &times; ' + boatHours + ' hrs)</span><span>' + money( crewTotal ) + '</span></div>';
			}
			if ( charges.fuelRate > 0 ) {
				html += '<div class="fy-pay-summary__line"><span>Boat deposit (' + money( charges.fuelRate ) + '/hr &times; ' + boatHours + ' hrs &mdash; credited at the dock)</span><span>' + money( fuelTotal ) + '</span></div>';
			}
			if ( resDep ) {
				html += '<div class="fy-pay-summary__line"><span>Boat deposit (' + depPct + '% of booking &mdash; credited at the dock)</span><span>' + money( resDep ) + '</span></div>';
			}
			// Each extra gets its own line, right under Fuel, so the customer
			// can see exactly what they picked rather than one lump sum.
			if ( addonsLines.length ) {
				addonsLines.forEach( function ( line ) {
					if ( line.quote ) {
						html += '<div class="fy-pay-summary__line"><span>' + $( '<i>' ).text( line.label ).html() +
							'</span><span>custom quote</span></div>';
						return;
					}
					var detail = line.detail ? ' (' + line.detail + ')' : '';
					html += '<div class="fy-pay-summary__line"><span>' + $( '<i>' ).text( line.label ).html() +
						detail + '</span><span>' + money( line.total ) + '</span></div>';
				} );
			}
			if ( addonsTotal > 0 ) {
				// Show the subtotal the split came from. The halves are
				// derived so the DISPLAYED figures always add back to it —
				// an odd total like $3,975 was otherwise shown as
				// $1,988 + $1,988 = $3,976.
				var nowShown   = Math.round( addonsNow );
				var laterShown = Math.round( addonsTotal ) - nowShown;
				html += '<div class="fy-pay-summary__line"><span>&nbsp;&nbsp;↳ extras ' + money( addonsTotal ) +
					' → ' + money( nowShown ) + ' now + ' + money( laterShown ) +
					' at the dock</span><span></span></div>';
			}
			html += '<div class="fy-pay-summary__line fy-pay-summary__line--total"><span>Charged today</span><span>' + money( chargedNow ) + '</span></div>';
			html += '<div class="fy-pay-summary__line"><span>Due at the dock</span><span>' + money( dueAtDock ) + '</span></div>';
			html += '</div>';
		}
		if ( chargedNow ) {
			html += '<div class="fy-pay-summary__due"><span>Due at the dock</span><strong>' + money( dueAtDock ) + '</strong></div>';
			html += '<div class="fy-pay-summary__note">Plus ' + money( dueAtDock ) + ' paid in person at the dock' +
				( addonsTotal > 0 ? ' (boat + the rest of your extras)' : ' for the boat' ) +
				' — cash or Zelle. No hidden fees.' +
				' Crew reservation fees and deposits are non-refundable if you cancel. Any boat deposit is already credited to that balance.</div>';
		} else if ( deposit ) {
			html += '<div class="fy-pay-summary__due"><span>Due today</span><strong>' + money( deposit ) + '</strong></div>';
			html += '<div class="fy-pay-summary__note">Only crew + deposit are charged online now to confirm your booking. This reserves both the boat and your crew exclusively for your selected date and hours. Remaining balance is due at the dock by cash or Zelle only.</div>';
		} else if ( hasAny ) {
			html += '<div class="fy-pay-summary__note">Pick a duration to see your total.</div>';
		} else {
			html += '<div class="fy-pay-summary__note">Select your date, time, duration and guests to see your booking summary here.</div>';
		}

		$summary.html( html ).addClass( 'fy-show' );
	}

	// Date/time changes don't fire WooCommerce's "found_variation" event (only
	// the two variation dropdowns do), so every relevant field re-renders
	// the summary directly instead of relying on that one event.
	var lastVariation = null;
	$form.on( 'found_variation', function ( event, variation ) {
		lastVariation = variation;
		renderSummary();
	} );
	$form.on( 'reset_data hide_variation', function () {
		lastVariation = null;
		renderSummary();
	} );
	$( document.body ).on( 'change', '#booking_date, #charter_start_time, #pa_charter-duration, #pa_passenger-count', renderSummary );
	// assets/addons.js fires this whenever the extras selection changes.
	$( document.body ).on( 'fy_addons_changed', function ( event, total, now, lines ) {
		addonsTotal = Number( total ) || 0;
		addonsNow   = Number( now ) || 0;
		addonsLines = Array.isArray( lines ) ? lines : [];
		renderSummary();
	} );
	renderSummary();

	// ---- 4. Breadcrumb ----
	// This Elementor product template has none at all — no way back to the
	// fleet list except the browser back button (verified live, 2026-08-08).
	var isPanama = /\/panama\//i.test( location.pathname ) || /panama/i.test( document.title );
	var cityCrumb = isPanama
		? { label: 'Panamá Yacht Rentals', href: 'https://feelingyachty.com/panama-yacht-rentals/' }
		: { label: 'Miami Yacht Rentals', href: 'https://feelingyachty.com/miami-yacht-rentals/' };
	var $titleWidget = $( '.elementor-widget-woocommerce-product-title' ).first();
	if ( $titleWidget.length && ! $( '.fy-breadcrumb' ).length ) {
		var yachtName = $titleWidget.find( '.product_title' ).text().trim();
		yachtName = yachtName.split( '|' )[ 0 ].trim();
		if ( yachtName.length > 45 ) {
			yachtName = yachtName.slice( 0, 45 ).trim() + '…';
		}
		var $crumb = $( '<nav class="fy-breadcrumb" aria-label="Breadcrumb"></nav>' );
		$crumb.html(
			'<a href="' + location.origin + '/">Home</a>' +
			'<span class="fy-breadcrumb__sep">/</span>' +
			'<a href="' + cityCrumb.href + '">' + cityCrumb.label + '</a>' +
			'<span class="fy-breadcrumb__sep">/</span>' +
			'<span class="fy-breadcrumb__current" aria-current="page">' + $( '<i>' ).text( yachtName ).html() + '</span>'
		);
		$titleWidget.before( $crumb );
	}

	// ---- 5. Pricing tiers as clickable cards ----
	// Different yachts render this two different ways: some put every tier
	// in one paragraph ("Pricing: 4 Hours – $800  6 Hours – $1,200 ..."),
	// others put a bare "Pricing:" label followed by a <ul> with one tier
	// per <li> (verified live on two separate yacht pages, 2026-08-08 —
	// the single-paragraph-only version silently found nothing on the
	// list-based yachts). Both are handled here.
	var tierPattern = /(\d+)\s*Hours?\s*[–—-]\s*\$([\d,]+)/i;
	var tiers = [];
	var $tierSource = null;

	var $tierList = $( 'li' ).filter( function () {
		return tierPattern.test( $( this ).text().trim() ) && 0 === $( this ).children().length;
	} ).closest( 'ul, ol' ).first();
	if ( $tierList.length ) {
		$tierList.find( 'li' ).each( function () {
			var m = tierPattern.exec( $( this ).text() );
			if ( m ) {
				tiers.push( { hours: m[ 1 ], price: m[ 2 ] } );
			}
		} );
		$tierSource = $tierList;
	}

	if ( ! tiers.length ) {
		var $pricingP = $( 'p' ).filter( function () {
			var t = $( this ).text();
			return /Pricing:/i.test( t ) && tierPattern.test( t );
		} ).first();
		if ( $pricingP.length ) {
			var priceText = $pricingP.text();
			var tierRe = new RegExp( tierPattern.source, 'gi' );
			var tm;
			while ( ( tm = tierRe.exec( priceText ) ) !== null ) {
				tiers.push( { hours: tm[ 1 ], price: tm[ 2 ] } );
			}
			$tierSource = $pricingP;
		}
	}

	if ( tiers.length && $tierSource && ! $tierSource.next().hasClass( 'fy-price-tiers' ) ) {
		var $tierWrap = $( '<div class="fy-price-tiers"></div>' );
		tiers.forEach( function ( t ) {
			var val = t.hours + '-hours';
			var $card = $( '<button type="button" class="fy-price-tier"></button>' ).attr( 'data-hours', val );
			$card.html( '<span class="fy-price-tier__hours">' + t.hours + ' Hours</span><span class="fy-price-tier__price">$' + t.price + '</span>' );
			$tierWrap.append( $card );
		} );
		$tierSource.after( $tierWrap ).hide();

		$tierWrap.on( 'click', '.fy-price-tier', function () {
			var val = $( this ).data( 'hours' ).toString();
			var $durSelect = $( '#pa_charter-duration' );
			if ( $durSelect.length && $durSelect.find( 'option[value="' + val + '"]' ).length ) {
				$durSelect.val( val ).trigger( 'change' );
			}
			$tierWrap.find( '.fy-price-tier' ).removeClass( 'fy-selected' );
			$( this ).addClass( 'fy-selected' );
			var $bookingForm = $( 'form.cart' );
			if ( $bookingForm.length ) {
				$( 'html, body' ).animate( { scrollTop: $bookingForm.offset().top - 100 }, 400 );
			}
		} );

		$( '#pa_charter-duration' ).on( 'change', function () {
			var val = $( this ).val();
			$tierWrap.find( '.fy-price-tier' ).removeClass( 'fy-selected' )
				.filter( '[data-hours="' + val + '"]' ).addClass( 'fy-selected' );
		} );
	}

	// ---- 6. "What's included" as badges instead of a comma-separated line ----
	var $includesP = $( 'p' ).filter( function () {
		return /Includes:/i.test( $( this ).text() );
	} ).first();
	if ( $includesP.length && ! $includesP.next().hasClass( 'fy-includes-badges' ) ) {
		var rawIncludes = $includesP.text().replace( /^[\s\S]*?Includes:\s*/i, '' );
		var items = rawIncludes.split( /,| & /i ).map( function ( s ) {
			return s.trim();
		} ).filter( Boolean );
		if ( items.length ) {
			var $badgeWrap = $( '<div class="fy-includes-badges"></div>' );
			items.forEach( function ( item ) {
				$badgeWrap.append( $( '<span class="fy-include-badge"></span>' ).text( item ) );
			} );
			$includesP.after( $badgeWrap ).hide();
		}
	}

	// ---- 7. Gallery photo counter (some yachts have 30+ photos) ----
	var $galleryMain = $( '.woocommerce-product-gallery__wrapper' ).first();
	var thumbTotal = $( '.flex-control-thumbs img' ).length;
	if ( $galleryMain.length && thumbTotal > 1 && ! $( '.fy-gallery-counter' ).length ) {
		var $counter = $( '<div class="fy-gallery-counter">1 / ' + thumbTotal + '</div>' );
		$galleryMain.css( 'position', 'relative' ).append( $counter );
		$( document.body ).on( 'click', '.flex-control-thumbs img', function () {
			var idx = $( this ).closest( 'li' ).index() + 1;
			$counter.text( idx + ' / ' + thumbTotal );
		} );
	}

	// ---- 8b. Move the Feeling Yachty Details tabs to full width ----
	// The fleet plugin's [fy_yacht_details] shortcode renders inside the
	// product description, which on this Elementor layout sits in the
	// narrow price/booking column — cramped for a 5-tab section. Move it to
	// sit full-width below the whole gallery+booking area instead, right
	// before Related Products (a reliable anchor already confirmed to exist
	// on every product page).
	var $dt = $( '.fy-dt' ).first();
	if ( $dt.length && ! $dt.hasClass( 'fy-dt--repositioned' ) ) {
		var $anchor = $( '.related, .up-sells' ).first();
		if ( $anchor.length ) {
			$anchor.before( $dt );
		} else {
			$( 'body' ).append( $dt );
		}
		$dt.addClass( 'fy-dt--repositioned' );
	}

	// ---- 8. "What am I paying today?" — right after the summary card, since
	// that is where the split between what's charged online and what's paid
	// at the dock is actually explained. Rendered OPEN by default: this is
	// the single most important thing for a customer to understand before
	// paying, so it must not be hidden behind a click. Still a <details>, so
	// it can be collapsed by anyone who has read it.
	if ( ! $( '.fy-deposit-faq' ).length ) {
		var addonPct = ( typeof fyAddons !== 'undefined' && fyAddons.depositPct ) ? fyAddons.depositPct : 50;
		var fc = ( typeof fyCharges !== 'undefined' ) ? fyCharges : {};
		var faqThr = Number( fc.depositThreshold ) || 0;
		var faqPct = Number( fc.depositPct ) || 0;
		var $faq = $(
			'<details class="fy-deposit-faq">' +
				'<summary>What am I paying today? <span class="fy-faq-caret" aria-hidden="true">▾</span></summary>' +
				'<p>Only crew + deposit are charged online now to confirm your booking. This reserves both the boat and your crew exclusively for your selected date and hours.</p>' +
				'<p>Boat $800 or less: Crew $75/hr + Deposit $25/hr<br>' +
				'Boat $801&ndash;$1,400: Crew $75/hr + Deposit $50/hr<br>' +
				'Boat over $1,400: Crew $100/hr + Deposit $50/hr' +
				( faqPct > 0 ? ' + ' + faqPct + '% boat deposit' : '' ) + '<br>' +
				'Premium yachts may require a 50% boat deposit<br>' +
				'Extras: ' + addonPct + '% due now</p>' +
				'<p>Because the boat and crew are taken off the schedule and reserved specifically for you, crew reservation fees and deposits are non-refundable if you cancel. Any boat deposit is credited toward your boat price. Remaining balance is due at the dock by cash or Zelle only.</p>' +
			'</details>'
		);
		$( '.fy-confirm-note' ).after( $faq );
	}
} );
