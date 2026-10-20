<?php
declare(strict_types=1);

/*
 * POST /api/subscribe.php            field: email   -> subscribe (or re-activate)
 * GET  /api/subscribe.php?unsubscribe=TOKEN           -> unsubscribe (link from the newsletter)
 */

require __DIR__ . '/bootstrap.php';
/** @var array $config */

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $pdo = db($config);

    if ($method === 'GET' && isset($_GET['unsubscribe'])) {
        $token = (string) $_GET['unsubscribe'];
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            json_out(400, ['ok' => false, 'error' => 'Invalid link.']);
        }
        $stmt = $pdo->prepare("UPDATE subscribers SET status = 'unsubscribed' WHERE unsubscribe_token = :t");
        $stmt->execute([':t' => $token]);
        json_out(200, ['ok' => true, 'message' => $stmt->rowCount() ? 'You have been unsubscribed.' : 'This link is no longer valid.']);
    }

    require_post();
    check_origin($config);
    prune_rate_limits($pdo);

    $email = strtolower(input_str('email', 190));
    if (!valid_email($email)) {
        json_out(422, ['ok' => false, 'error' => 'Please enter a valid email address.', 'fields' => ['email' => 'Please enter a valid email address.']]);
    }

    $ipHash = ip_hash($config);
    if (!rate_limit_ok($pdo, $config, 'subscribe:' . $ipHash)) {
        json_out(429, ['ok' => false, 'error' => 'Too many attempts. Please try again later.']);
    }

    $find = $pdo->prepare('SELECT id, status FROM subscribers WHERE email = :e');
    $find->execute([':e' => $email]);
    $row = $find->fetch();

    if ($row === false) {
        $token = bin2hex(random_bytes(32));
        $pdo->prepare('INSERT INTO subscribers (email, unsubscribe_token, ip_hash) VALUES (:e, :t, :ip)')
            ->execute([':e' => $email, ':t' => $token, ':ip' => $ipHash]);
        json_out(201, ['ok' => true, 'message' => 'Thanks for subscribing! Watch your inbox for updates.']);
    }

    if ($row['status'] === 'unsubscribed') {
        $pdo->prepare("UPDATE subscribers SET status = 'active' WHERE id = :id")->execute([':id' => $row['id']]);
        json_out(200, ['ok' => true, 'message' => 'Welcome back! You are subscribed again.']);
    }

    // Already active: say so without revealing anything else about the address.
    json_out(200, ['ok' => true, 'message' => 'You are already subscribed. Thank you!']);
} catch (Throwable $e) {
    error_log('[sevacoins] subscribe: ' . $e->getMessage());
    json_out(500, ['ok' => false, 'error' => 'Something went wrong on our side. Please try again later.']);
}
