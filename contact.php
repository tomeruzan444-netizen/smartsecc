<?php
/**
 * Lead form handler (Hostinger PHP). Sends the lead by email and answers with JSON.
 * Optional: create contact-config.php next to this file to override the settings below
 * (it is blocked from web access by .htaccess and not committed to git).
 */
declare(strict_types=1);

$config = [
    'to'        => 'support@smartsecc.co.il',
    'from'      => 'no-reply@smartsecc.co.il', // must be a mailbox on this domain for Hostinger to send
    'subject'   => 'ליד חדש מהאתר – סמארטסק',
    'min_secs'  => 3,                           // bots submit instantly
];
if (is_file(__DIR__ . '/contact-config.php')) {
    $config = array_merge($config, (array) require __DIR__ . '/contact-config.php');
}

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, string $error = '', int $code = 200): void
{
    global $wantsJson;
    http_response_code($code);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'error' => $error], JSON_UNESCAPED_UNICODE);
    } else {
        // no-JS fallback: back to the page the form was sent from
        $back = $_POST['page'] ?? '/';
        if (!is_string($back) || !str_starts_with($back, '/') || str_starts_with($back, '//')) {
            $back = '/';
        }
        header('Location: ' . $back . ($ok ? '?sent=1' : '?sent=0') . '#lead-form', true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'method', 405);
}

$field = static fn(string $k, int $max): string =>
    mb_substr(trim(str_replace(["\r", "\n"], ' ', (string) ($_POST[$k] ?? ''))), 0, $max);

// honeypot + timing trap
if (($_POST['website'] ?? '') !== '') {
    respond(true);
}
$ts = (int) ($_POST['ts'] ?? 0);
if ($ts > 0 && (time() * 1000 - $ts) < $config['min_secs'] * 1000) {
    respond(true);
}

$name    = $field('name', 80);
$phone   = $field('phone', 20);
$city    = $field('city', 60);
$message = mb_substr(trim((string) ($_POST['message'] ?? '')), 0, 1500);
$page    = $field('page', 300);
$consent = ($_POST['consent'] ?? '') === '1';

$digits = preg_replace('/\D+/', '', $phone);
// "message" is optional: the hero bar and footer forms only ask for name, phone and area
if ($name === '' || $city === '' || !$consent || strlen($digits) < 9 || strlen($digits) > 13) {
    respond(false, 'validation', 422);
}

$site = 'https://smartsecc.co.il';
$body = implode("\n", [
    'ליד חדש התקבל מהאתר:',
    '',
    'שם: ' . $name,
    'טלפון: ' . $phone,
    'עיר: ' . $city,
    'איך נוכל לעזור: ' . ($message !== '' ? $message : '—'),
    '',
    'עמוד: ' . $site . $page,
    'זמן: ' . date('d/m/Y H:i'),
    'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? ''),
]);

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: =?UTF-8?B?' . base64_encode('אתר סמארטסק') . '?= <' . $config['from'] . '>',
    'X-Mailer: smartsecc-site',
];
$subject = '=?UTF-8?B?' . base64_encode($config['subject'] . ' – ' . $name) . '?=';

$sent = mail($config['to'], $subject, $body, implode("\r\n", $headers), '-f' . $config['from']);

// keep a server-side copy so no lead is lost if mail delivery fails
$logDir = dirname(__DIR__) . '/leads';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0750, true);
}
@file_put_contents($logDir . '/leads-' . date('Y-m') . '.csv',
    implode(',', array_map(static fn($v) => '"' . str_replace('"', '""', $v) . '"',
        [date('c'), $name, $phone, $city, str_replace(["\r", "\n"], ' ', $message), $page, $sent ? 'sent' : 'mail-failed'])) . "\n",
    FILE_APPEND | LOCK_EX);

respond($sent, $sent ? '' : 'mail', $sent ? 200 : 500);
