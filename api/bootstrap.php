<?php
declare(strict_types=1);

/*
 * Shared bootstrap for the SevaCoin API.
 * - loads config (env vars override defaults)
 * - opens one PDO connection (utf8mb4, exceptions, real prepares)
 * - JSON helpers, input cleaning, rate limiting, IP hashing
 */

const SEVA_ROOT = __DIR__ . DIRECTORY_SEPARATOR . '..';

$config = [
    'db' => [
        'host'    => getenv('SEVA_DB_HOST') ?: '127.0.0.1',
        'port'    => (int) (getenv('SEVA_DB_PORT') ?: 3306),
        'name'    => getenv('SEVA_DB_NAME') ?: 'sevacoins',
        'user'    => getenv('SEVA_DB_USER') ?: 'root',
        'pass'    => getenv('SEVA_DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
    // Secret used to hash IP addresses (never stored in clear). Set SEVA_IP_SALT in production.
    'ip_salt'     => getenv('SEVA_IP_SALT') ?: 'change-this-salt-in-production',
    'mail_to'     => getenv('SEVA_MAIL_TO') ?: '',      // optional: notify this address on new messages
    'mail_from'   => getenv('SEVA_MAIL_FROM') ?: 'no-reply@sevacoin.local',
    'rate_limit'  => ['max' => 5, 'window_seconds' => 600],   // 5 submissions per 10 minutes per visitor
    'allowed_origins' => [],                             // e.g. ['https://sevacoin.example'] ; empty = same origin only
];

/** @return PDO */
function db(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $d = $config['db'];
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $d['host'], $d['port'], $d['name'], $d['charset']);
    $pdo = new PDO($dsn, $d['user'], $d['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

/** Send a JSON response and stop. */
function json_out(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

/** Only accept POST; everything else gets 405. */
function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        json_out(405, ['ok' => false, 'error' => 'Method not allowed.']);
    }
}

/** Same-origin check for browser requests (Origin/Referer must match this host, or be in allowed_origins). */
function check_origin(array $config): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return; // non-browser clients (curl, server-to-server) send no Origin
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $ok = parse_url($origin, PHP_URL_HOST) === explode(':', $host)[0] || in_array($origin, $config['allowed_origins'], true);
    if (!$ok) {
        json_out(403, ['ok' => false, 'error' => 'Forbidden origin.']);
    }
}

/** Read a field from a form POST or a JSON body, as a trimmed string. */
function input_str(string $key, int $max): string
{
    static $json = null;
    if ($json === null) {
        $raw = file_get_contents('php://input') ?: '';
        $decoded = str_starts_with(ltrim($raw), '{') ? json_decode($raw, true) : null;
        $json = is_array($decoded) ? $decoded : [];
    }
    $value = $_POST[$key] ?? $json[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }
    $value = trim(str_replace("\0", '', $value));
    return mb_substr($value, 0, $max, 'UTF-8');
}

/** Hash the visitor's IP with the salt, so we can rate-limit and spot abuse without storing the address. */
function ip_hash(array $config): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return hash_hmac('sha256', $ip, $config['ip_salt']);
}

/**
 * Sliding-window rate limit using the rate_limits table.
 * Returns true when the request is allowed. Also prunes old rows for this bucket.
 */
function rate_limit_ok(PDO $pdo, array $config, string $bucket): bool
{
    $window = (int) $config['rate_limit']['window_seconds'];
    $max    = (int) $config['rate_limit']['max'];

    $pdo->prepare('DELETE FROM rate_limits WHERE bucket = :b AND created_at < (NOW() - INTERVAL :w SECOND)')
        ->execute([':b' => $bucket, ':w' => $window]);

    $count = $pdo->prepare('SELECT COUNT(*) FROM rate_limits WHERE bucket = :b');
    $count->execute([':b' => $bucket]);
    if ((int) $count->fetchColumn() >= $max) {
        return false;
    }
    $pdo->prepare('INSERT INTO rate_limits (bucket) VALUES (:b)')->execute([':b' => $bucket]);
    return true;
}

/** Occasionally clear rate-limit rows older than a day, so the table stays small. */
function prune_rate_limits(PDO $pdo): void
{
    if (random_int(1, 200) === 1) {
        $pdo->exec('DELETE FROM rate_limits WHERE created_at < (NOW() - INTERVAL 1 DAY)');
    }
}

function valid_email(string $email): bool
{
    return $email !== '' && mb_strlen($email, 'UTF-8') <= 190 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}
