<?php

namespace Drupal\weather_data\Service;

/**
 * A service class for fetching weather data.
 */
trait UnitConversionTrait
{
    public function millimetersToInches($mm)
    {
        // 1 mm = 0.03937008 inches
        return $mm * 0.03937008;
    }

    /**
     * Get a temperature scalar from a wmoUnit temperature object.
     */
    public function getTemperatureScalar(
        \stdClass $temperature,
        bool $inFahrenheit = true,
    ) {
        $rawValue = $temperature->value;

        if ($rawValue == null) {
            return null;
        }

        $isFahrenheit = $temperature->unitCode == "wmoUnit:degF";

        $out = null;
        if ($isFahrenheit) {
            if ($inFahrenheit) {
                $out = $rawValue;
            } else {
                $out = (($rawValue - 32) * 5) / 9;
            }
        } else {
            if ($inFahrenheit) {
                $out = ($rawValue * 9) / 5 + 32;
            } else {
                $out = $rawValue;
            }
        }

        return (int) round($out);
    }
}
