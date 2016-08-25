# VolumeFader

*Sophisticated media volume fading in ES6 (JavaScript)*

The class *VolumeFader* allows to make soft volume changes on HTML5 media elements. This is useful, for instance, to avoid hard volume breaks when pausing a song, or to fade in and out a looping sample.


## Quick Start

Get a media element. This can be created on-the-fly or referenced from the DOM:
```
let media = new Audio()
let media = document.querySelector( … )
```

Create a new fader for your media element:
```
let Fader = new VolumeFader( media )
```

Start playing and use the fader to smoothly fade in:
```
media.play()
Fader.fadeIn()
```

The *VolumeFader* offers plenty options for customization, see the detailed documentation below.

## Reference

### Constructor & Configuration

The constructor *VolumeFader()* takes two arguments:

- *media* `HTMLMediaElement` The HTML5 media element to control.
- *options* `Object` A plain object with optional settings. Can be left undefined.

While *options* can be omitted, a valid media element is strictly required. If *media* is not an `HTMLMediaElement`, a `TypeError` is thrown. A `TypeError` is also thrown if any of the optional settings are defined but not satisfying the specification below. Make sure to validate your arguments in advance or wrap your `new` call in a `try` structure.

The following *options* are available:

- *initialVolume* `Number` A floating point [volume](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume) level ∈ [0,1]. Applied to media element during initialization, if set.
- *fadeDuration* `Number` A positive non-zero integer. Sets the fade length in milliseconds. Defaults to 1000 ms. See also the method *setFadeDuration()*.
- *fadeScaling* `String` `Number` Either "linear", "logarithmic", or a positive non-zero number as dynamic range in dB for a logarithmic fade.
- *logger* `Function` A function which accepts one or more arguments to be logged. Logging is disabled by default. Use for debugging.

If *fadeScaling* is set to "linear", the media's amplitude is not rescaled while fading. The keyword "logarithmic" uses a natural logarithmic scale and defaults to 60 dB dynamic range. This is equivalent to the number 60. If *fadeScaling* is not set, a 60 dB logarithmic scale is used as default. See section “Logarithmic Fading” for background information on logarithmic scales.

### Common Instance Methods

The following methods can be called on a *VolumeFader* instance:

###### .setFadeDuration( *fadeDuration* )
- Sets the duration of new fades.
- *fadeDuration* `Number` A positive non-zero integer setting the fade length in milliseconds. Can also be passed in *options*, see above.
- Throws a *TypeError* if *fadeDuration* is not greater than zero.
- Returns the *VolumeFader* instance for chaining.

###### .fadeTo( *targetVolume*, *callback* )
- Starts a new fade to the specified volume level and fires a callback when done.
- *targetVolume* `Number` A floating point [volume](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume) level ∈ [0,1] in linear scale.
- *callback* `Function` (optional) A function to call when the fade is complete.
- Returns the *VolumeFader* instance for chaining.

###### .fadeIn( *callback* ) & .fadeOut( *callback* )
- These are shorthands for fading to maximum and minimum volume. This is equivalent to calling *fadeTo()* with *targetVolume* set to 1 and 0, respectively.
- *callback* is passed through, see *fadeTo()*.
- Returns the *VolumeFader* instance for chaining.

It is not recommended to change any of a *VolumeFader* instance's properties directly without using one of the documented methods. These methods include sanity checks which prevent input-related runtime errors.

### Advanced Methods

There are a couple of internal methods of which some might come in handy to be used manually in particular cases. All of them are meant to be called on a *VolumeFader* instance.

###### .stop() & .start()
- Suspends and resumes the fader. While called internally, these methods can be used to manually stop the fader from altering the media's volume. Note that the internal fade progress is not stopped.
- Returns the *VolumeFader* instance for chaining.

###### .scale.volumeToInternal( *level* )
- Maps a volume level to the internal fading level to the scale defined by *fadeScaling*.
- *input* `Number` A floating point level ∈ [0,1].
- Returns the scaled level ∈ [0,1].

###### .scale.internalToVolume( *level* )
- Maps the internal fading level to a volume level from the scale defined by *fadeScaling*.
- *input* `Number` A floating point level ∈ [0,1].
- Returns the scaled level ∈ [0,1].

Note that the default scaling functions do not check their arguments. If you intend to use these internal functions, it's your responsibility to exclusively pass numbers within the specified range to avoid type or math errors in the middle of execution.

The scaling functions can be replaced with custom functions for the mapping *[0,1] → [0,1]*, if a custom scale is desired.


## Logarithmic Fading

The option *fadeScaling* (see above) controls the fading style – that is, how the elapsing time is mapped to a volume level. The *VolumeFader* can fade between volume levels both in a linear and non-linear way.

The human ear can differentiate between low volume levels a lot better than between high levels. If you desire “natural” volume changes which sound like transitions at a subjectively constant pace, use a [logarithmic scale](https://en.wikipedia.org/wiki/Logarithmic_scale).

To simulate a logarithmic progression over time, the linear progress (defined by the elapsed fade time) is fed into an exponential function. For example, when ramping the volume up, the level is thereby incremented in gradually growing steps, spending more fading time on the lower volume levels than on higher ones.

The [common logarithm](https://en.wikipedia.org/wiki/Common_logarithm) indicates how many orders of magnitude a value is apart from 1. Or, which power of 10 would equal a given value. For instance, the fraction 0.1 (= ⅒) is the same as 10 to the power of -1. So the common logarithm of 0.1 is -1, the logarithm of 0.01 would be -2 etc. It's common to use the unit [Decibel](https://en.wikipedia.org/wiki/Decibel) for logarithmic scales. For amplitudes, 20 dB correspond to one order of magnitude, e.g. 0.01 = -2 × 20 dB = -40 dB.

While a value of zero can be expressed as 10 to the power of negative infinity, in real-world applications it's necessary to limit the dynamic range to not deal with infinitely small fractions. Depending on the duration of the fade, the audio playback equipment and the environmental noise, very low volume levels might not even be heard by the listener, making the sound effectively silent during that time. That's why the *VolumeFader* fades over a limited number of magnitudes.

By default or when setting *fadeScaling* to "logarithmic", the fade covers an amplitude range of 60 dB, with a thousandth as smallest fraction of the final volume. You may want to increase the dynamic range for longer fade durations by setting *fadeScaling* to a positive number in Decibels, for instance:
```
let Fader = new VolumeFader( media, { fadeDuration: 2000, fadeScaling: 80 } )
```

Note that *fadeScaling* affects transitions between volume levels, not the level itself. For instance, the *targetVolume* specified for *fadeTo()* is a linear [volume](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume) level as known from [media](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement) elements. Volume levels from different scales must be converted to linear. Say you're using the default logarithmic scale and you'd like to fade to -30 dB, that is 50% of the 60 dB range. The method *scale.internalToVolume()* of your fader instance will map it you:
```
let Fader = new VolumeFader( media )
Fader.fadeTo( Fader.scale.internalToVolume( 0.5 ) )
```
