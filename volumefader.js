/**
 * VolumeFader
 * Proper Media Volume Fading
 *
 * Requires browser support for:
 * - HTMLMediaElement
 * - requestAnimationFrame()
 * - ES6
 *
 * Does not depend on any third-party library.
 *
 * License: MIT
 *
 * Nick Schwarzenberg
 * v0.2.0, 06/2016
 */

;(function( root ){

    'use strict'


    // internal utility: check if value is a valid volume level and throw if not
    let validateVolumeLevel = ( value ) =>
    {
        // number between 0 and 1?
        if ( ! Number.isNaN( value ) && value >= 0 && value <= 1 )
        {
            // yup, that's fine
            return
        }
        else
        {
            // abort and throw an exception
            throw new TypeError( "Number between 0 and 1 expected for volume!" )
        }
    }


    // internal utility: exponential scaler with 30 dB dynamic range (smallest value above zero is 0.001)
    // (the input 0…1 is interpreted as logarithmic volume and expanded to a linear scale 0…1)
    let exponentialScaler = ( logarithmic ) =>
    {
        // special case: make zero return zero
        if ( logarithmic == 0 )
        {
            // since the dynamic range is limited,
            // allow a zero to produce a plain zero instead of a small faction
            // (audio would not be recognized as silent otherwise)
            return 0
        }
        else
        {
            // scale to -30 dB
            logarithmic = ( logarithmic - 1 ) * 3

            // compute power of 10
            return Math.pow( 10, logarithmic )
        }
    }


    // main class
    class VolumeFader
    {
        /**
         * VolumeFader Constructor
         *
         * @param media {HTMLMediaElement} - audio or video element to be controlled
         * @param options {Object} - an object with optional settings
         * @throws {TypeError} if options.initialVolume or options.fadeDuration are invalid
         *
         * options:
         * .logger: {Function} logging `function(stuff, …)` for execution information
         * .volumeScaler: {Function} scaling `function(value)` used to map fade levels 0…1 to volume levels 0…1
         * .initialVolume: {Number} media volume 0…1 to apply during setup
         * .fadeDuration: {Number} time in milliseconds to complete a fade
         */
        constructor( media, options )
        {
            // passed media element of correct type?
            if ( media instanceof HTMLMediaElement )
            {
                // save reference to media element
                this.media = media
            }
            else
            {
                // abort and throw an exception
                throw new TypeError( "Media element expected!" )
            }

            // make sure options is an object
            options = options || {}

            // log function passed?
            if ( options.logger instanceof Function )
            {
                // set log function
                this.logger = options.logger

                // log setting
                this.logger && this.logger( "[VolumeFader] Using custom logger:", this.logger )
            }
            else
            {
                // set log function explicitly to false
                this.logger = false
            }

            // volume scaling function given?
            if ( options.volumeScaler !== undefined )
            {
                // valid function?
                if ( options.volumeScaler instanceof Function )
                {
                    // set volume scaler
                    this.volumeScaler = options.volumeScaler

                    // log setting
                    this.logger && this.logger( "[VolumeFader] Using custom volume scaler:", this.volumeScaler )
                }
                else
                {
                    // abort and throw exception
                    throw new TypeError( "Expected function for volume scaler!" )
                }
            }
            // no custom scaler defined?
            else
            {
                // use default scaler (exponential with limited dynamic range)
                this.volumeScaler = exponentialScaler
            }

            // initial volume given?
            if ( options.initialVolume !== undefined )
            {
                // validate volume level and throw if invalid
                validateVolumeLevel( options.initialVolume )

                // set initial volume
                this.media.volume = this.volumeScaler( options.initialVolume )

                // log setting
                this.logger && this.logger( "[VolumeFader] Set initial volume to " + String(this.media.volume) + "." )
            }

            // fade duration given?
            if ( options.fadeDuration !== undefined )
            {
                // try to set given fade duration (will log if successful and throw if not)
                this.setFadeDuration( options.fadeDuration )
            }
            else
            {
                // set default fade duration (500 ms)
                this.fadeDuration = 500
            }

            // indicate that fader is not active yet
            this.active = false

            // initialization done
            this.logger && this.logger( "[VolumeFader] Initialized for", this.media )
        }


        // (re)start update cycle (must be running for volume updates)
        start()
        {
            // set fader to be active
            this.active = true

            // start by running the update method
            this.updateVolume()

            // return instance for chaining
            return this
        }

        // stop update cycle (interrupting any fade)
        stop()
        {
            // set fader to be inactive
            this.active = false

            // return instance for chaining
            return this
        }


        // set fade duration
        setFadeDuration( fadeDuration )
        {
            // if duration is a valid number > 0…
            if ( ! Number.isNaN( fadeDuration ) && fadeDuration > 0 )
            {
                // set fade duration
                this.fadeDuration = fadeDuration

                // log setting
                this.logger && this.logger( "[VolumeFader] Set fade duration to " + String(fadeDuration) + " ms." )
            }
            else
            {
                // abort and throw an exception
                throw new TypeError( "Positive number expected for fade duration!" )
            }

            // return instance for chaining
            return this
        }


        // update media volume (calls itself using a timer)
        updateVolume()
        {
            // fader active and fade available to process?
            if ( this.active && this.fade )
            {
                // get current time
                let now = Date.now()

                // time left for fading?
                if ( now < this.fade.time.end )
                {
                    // compute current fade progress
                    let progress = ( now - this.fade.time.start ) / ( this.fade.time.end - this.fade.time.start )

                    // compute current level
                    let level = progress * ( this.fade.volume.end - this.fade.volume.start ) + this.fade.volume.start

                    // scale fade level to native linear volume and apply to media element
                    this.media.volume = this.volumeScaler( level )

                    // schedule next update
                    root.requestAnimationFrame( this.updateVolume.bind( this ) )
                }
                else
                {
                    // log end of fade
                    this.logger && this.logger( "[VolumeFader] Fade to " + String(this.fade.volume.end) + " complete." )

                    // time is up, jump to target volume
                    this.media.volume = this.volumeScaler( this.fade.volume.end )

                    // set fader to be inactive
                    this.active = false

                    // done, call back (if callable)
                    this.fade.callback instanceof Function && this.fade.callback()

                    // clear fade
                    this.fade = undefined
                }
            }

            // return instance for chaining
            return this
        }


        // define new fade
        fadeTo( targetVolume, callback )
        {
            // validate volume and throw if invalid
            validateVolumeLevel( targetVolume )

            // define new fade towards a given volume with an optional callback
            this.fade =
            {
                volume: { start: this.media.volume, end: targetVolume },
                time: { start: Date.now(), end: Date.now() + this.fadeDuration },
                callback: callback
            }

            // log new fade
            this.logger && this.logger( "[VolumeFader] New fade:", this.fade )

            // start fading
            this.start()

            // return instance for chaining
            return this
        }


        // convenience methods for complete fades
        fadeIn( callback ) { this.fadeTo( 1, callback ) }
        fadeOut( callback ) { this.fadeTo( 0, callback ) }
    }


    // export class to root scope
    root.VolumeFader = VolumeFader

})( window )
