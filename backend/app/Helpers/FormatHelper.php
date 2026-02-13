<?php

namespace App\Helpers;

class FormatHelper
{
    /**
     * Format amount as Ghana Cedi (GH₵)
     */
    public static function ghs(float|int|string|null $amount, int $decimals = 2): string
    {
        if ($amount === null || $amount === '') {
            return 'GH₵ 0.00';
        }
        $num = (float) $amount;
        return 'GH₵ ' . number_format($num, $decimals, '.', ',');
    }

    /**
     * Cap percentage at 100%
     */
    public static function capPercent(float|int|string|null $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        return (float) min(100, max(0, (float) $value));
    }

    /**
     * Format percentage capped at 100%
     */
    public static function percent(float|int|string|null $value, int $decimals = 1): string
    {
        $capped = self::capPercent($value);
        return number_format($capped, $decimals) . '%';
    }
}
