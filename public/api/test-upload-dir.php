<?php
// Diagnóstico rápido de permisos — BORRAR después de usar
$public = realpath(__DIR__ . '/..') ?: (__DIR__ . '/..');
$target = $public . '/empresas/bridge._sc/cromos/equipo-alpha';

// Usuario real del proceso PHP
$processUser = function_exists('posix_geteuid')
    ? (posix_getpwuid(posix_geteuid())['name'] ?? posix_geteuid())
    : (shell_exec('whoami') ?: get_current_user());

// Permisos en octal
$perms = function($path) {
    if (!file_exists($path)) return 'no existe';
    return substr(sprintf('%o', fileperms($path)), -4);
};

// Dueño del directorio
$owner = function($path) {
    if (!file_exists($path)) return 'no existe';
    $stat = stat($path);
    return function_exists('posix_getpwuid')
        ? (posix_getpwuid($stat['uid'])['name'] ?? $stat['uid'])
        : $stat['uid'];
};

header('Content-Type: application/json');
echo json_encode([
    'process_user'     => trim($processUser),
    'script_owner'     => get_current_user(),
    'public_dir'       => $public,
    'public_perms'     => $perms($public),
    'public_owner'     => $owner($public),
    'public_writable'  => is_writable($public),
    'empresas_perms'   => $perms($public . '/empresas'),
    'empresas_owner'   => $owner($public . '/empresas'),
    'empresas_writable'=> is_writable($public . '/empresas'),
    'target_exists'    => is_dir($target),
    'target_perms'     => $perms($target),
    'target_owner'     => $owner($target),
    'target_writable'  => is_dir($target) ? is_writable($target) : false,
], JSON_PRETTY_PRINT);
