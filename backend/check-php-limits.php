<?php
/**
 * PHP Configuration Checker
 * Run this file to check PHP upload limits
 * Usage: php check-php-limits.php
 */

echo "🔍 PHP Configuration Check\n";
echo str_repeat("=", 50) . "\n\n";

// Check upload_max_filesize
$uploadMax = ini_get('upload_max_filesize');
$uploadMaxBytes = return_bytes($uploadMax);
echo "📤 upload_max_filesize: " . $uploadMax . " (" . format_bytes($uploadMaxBytes) . ")\n";

// Check post_max_size
$postMax = ini_get('post_max_size');
$postMaxBytes = return_bytes($postMax);
echo "📥 post_max_size: " . $postMax . " (" . format_bytes($postMaxBytes) . ")\n";

// Check max_execution_time
$maxExecution = ini_get('max_execution_time');
echo "⏱️  max_execution_time: " . ($maxExecution == 0 ? "Unlimited" : $maxExecution . " seconds") . "\n";

// Check max_input_time
$maxInput = ini_get('max_input_time');
echo "⏱️  max_input_time: " . ($maxInput == -1 ? "Unlimited" : $maxInput . " seconds") . "\n";

// Check memory_limit
$memoryLimit = ini_get('memory_limit');
$memoryLimitBytes = return_bytes($memoryLimit);
echo "💾 memory_limit: " . $memoryLimit . " (" . format_bytes($memoryLimitBytes) . ")\n";

echo "\n" . str_repeat("=", 50) . "\n\n";

// Recommendations
echo "💡 Recommendations:\n";
echo str_repeat("-", 50) . "\n";

$recommendedUpload = 20 * 1024 * 1024; // 20MB
$recommendedPost = 25 * 1024 * 1024; // 25MB

if ($uploadMaxBytes < $recommendedUpload) {
    echo "⚠️  upload_max_filesize is below 20MB. Recommended: 20M or higher\n";
    echo "   Add to php.ini: upload_max_filesize = 20M\n";
    echo "   Or add to .htaccess: php_value upload_max_filesize 20M\n";
    echo "   Or add to public/.htaccess: php_value upload_max_filesize 20M\n\n";
} else {
    echo "✅ upload_max_filesize is sufficient (>= 20MB)\n\n";
}

if ($postMaxBytes < $recommendedPost) {
    echo "⚠️  post_max_size is below 25MB. Recommended: 25M or higher\n";
    echo "   Note: post_max_size should be larger than upload_max_filesize\n";
    echo "   Add to php.ini: post_max_size = 25M\n";
    echo "   Or add to .htaccess: php_value post_max_size 25M\n";
    echo "   Or add to public/.htaccess: php_value post_max_size 25M\n\n";
} else {
    echo "✅ post_max_size is sufficient (>= 25MB)\n\n";
}

if ($maxExecution > 0 && $maxExecution < 300) {
    echo "⚠️  max_execution_time is below 300 seconds. Recommended: 300 or 0 (unlimited)\n";
    echo "   Add to php.ini: max_execution_time = 300\n\n";
} else {
    echo "✅ max_execution_time is sufficient\n\n";
}

// Check php.ini location
$phpIniPath = php_ini_loaded_file();
echo "📄 php.ini location: " . ($phpIniPath ?: "Not found") . "\n";

// Check if we can override in .htaccess
if (function_exists('apache_get_modules') && in_array('mod_php', apache_get_modules())) {
    echo "✅ Apache mod_php detected - .htaccess overrides will work\n";
} else {
    echo "ℹ️  .htaccess overrides may not work (using PHP-FPM or CLI)\n";
    echo "   Consider setting limits in php.ini or php-fpm pool config\n";
}

echo "\n" . str_repeat("=", 50) . "\n";

/**
 * Convert shorthand byte notation to bytes
 */
function return_bytes($val) {
    $val = trim($val);
    $last = strtolower($val[strlen($val)-1]);
    $val = (int)$val;
    
    switch($last) {
        case 'g':
            $val *= 1024;
        case 'm':
            $val *= 1024;
        case 'k':
            $val *= 1024;
    }
    
    return $val;
}

/**
 * Format bytes to human readable
 */
function format_bytes($bytes, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    
    $bytes /= pow(1024, $pow);
    
    return round($bytes, $precision) . ' ' . $units[$pow];
}
