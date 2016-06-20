/**
 * VolumeFader
 * Linear Media Volume Fading
 *
 * License: AGPLv3
 *
 * Nick Schwarzenberg
 * v0.1.0, 06/2016
 */

;(function( root ){

    'use strict'

    // utility: check if number is a valid volume or duration
    let validZeroToOne = (number) => ! Number.isNaN( number ) && number >= 0 && number <= 1
    let validPositive = (number) => ! Number.isNaN( number ) && number > 0

    // main class
    class VolumeFader
    {
        // initialize new fader
        constructor( mediaElement, initialVolume, fadeDuration, updateInterval, log )
        {
            // set log preference
            this.log = log || false

            // if passed media element is not of correct type…
            if ( ! mediaElement instanceof HTMLMediaElement )
            {
                // abort and throw an exception
                throw new TypeError( "Media element expected!" )
            }

            // save reference to media element
            this._media = mediaElement

            // valid initial volume given?
            if ( validZeroToOne( initialVolume ) )
            {
                // set initial volume
                this._media.volume = initialVolume
            }

            try
            {
                // try to set fade duration to given value
                this.setFadeDuration( fadeDuration )
            }
            catch ( error )
            {
                // inform about fallback
                this.log && console.log( "[VolumeFader] Using default fade duration." )

                // set default fade duration (500 ms)
                this.setFadeDuration( 500 )
            }

            // if timer is not specifically disabled…
            if ( updateInterval !== 0 && updateInterval !== false )
            {
                try
                {
                    // try to set update interval to given value
                    this.setUpdateInterval( updateInterval )
                }
                catch ( error )
                {
                    // inform about fallback
                    this.log && console.log( "[VolumeFader] Using default update interval." )

                    // set update interval to default (50 ms)
                    this.setUpdateInterval( 50 )
                }

                // start timer
                this.start()
            }

            // initialization done
            this.log && console.log( "[VolumeFader] Initialized for", this._media )
        }


        // getter for whether the fader is running (returns true if interval timer is set)
        get active() { return !! this._intervalTimer }

        // (re)start timer (must be running for volume updates)
        start( updateInterval )
        {
            // update interval given?
            if ( updateInterval !== undefined )
            {
                // set given update interval
                this.setUpdateInterval( updateInterval )
            }

            // stop old timer if already running
            this.active && this.stop()

            // create new interval timer
            this._intervalTimer = setInterval( this.updateVolume.bind( this ), this._updateInterval )

            // return instance for chaining
            return this
        }

        // stop timer (disabling volume updates)
        stop()
        {
            // clear current interval timer
            clearInterval( this._intervalTimer )

            // return instance for chaining
            return this
        }


        // set timer update interval
        setUpdateInterval( updateInterval )
        {
            // if interval is a valid number > 0…
            if ( validPositive( updateInterval ) )
            {
                // save timer update interval
                this._updateInterval = updateInterval

                // restart timer (but only if already running)
                this.active && this.start()
            }
            else
            {
                // abort and throw an exception
                throw new TypeError( "Positive number expected for update interval!" )
            }

            // return instance for chaining
            return this
        }


        // set fade duration
        setFadeDuration( fadeDuration )
        {
            // if duration is a valid number > 0…
            if ( validPositive( fadeDuration ) )
            {
                // set fade duration
                this._fadeDuration = fadeDuration
            }
            else
            {
                // abort and throw an exception
                throw new TypeError( "Positive number expected for fade duration!" )
            }

            // return instance for chaining
            return this
        }


        // update media volume (called by interval timer)
        updateVolume()
        {
            // is there a fade to process?
            if ( this._fade )
            {
                // compute time left for fading
                let remainingTime = this._fade.timestamp - Date.now()

                // time left for fading?
                if ( remainingTime > this._updateInterval )
                {
                    // compute difference to target volume
                    let volumeDelta = this._fade.volume - this._media.volume

                    // compute volume increment according to timer interval
                    let volumeIncrement = volumeDelta * this._updateInterval / remainingTime

                    // adjust volume
                    this._media.volume += volumeIncrement
                }
                else
                {
                    // time is up, jump to target volume
                    this._media.volume = this._fade.volume

                    // done, call back (if callable)
                    this._fade.callback instanceof Function && this._fade.callback()

                    // clear fade
                    this._fade = undefined
                }
            }

            // return instance for chaining
            return this
        }


        // define new fade
        fadeTo( targetVolume, callback )
        {
            // if no valid volume given…
            if ( ! validZeroToOne( targetVolume ) )
            {
                // abort and throw an exception
                throw new TypeError( "Number between 0 and 1 expected for volume!" )
            }

            // define fade towards given volume to complete in the future with an optional callback
            this._fade =
            {
                volume: targetVolume,
                timestamp: Date.now() + this._fadeDuration,
                callback: callback
            }

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
