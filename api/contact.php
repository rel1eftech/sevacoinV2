<?php
declare(strict_types=1);

/*
 * POST /api/contact.php
 * Fields: name, email, subject, message, website (honeypot, must be empty)
 * Accepts a normal form POST or a JSON body. Returns JSON.
 */

require __DIR__ . '/bootstrap.php';
/** @var array $config */

require_post();
check_origin($config);

// Honeypot: real visitors never fill the hidden "website" field. Pretend success so bots learn nothing.
if (input_str('website', 200) !== '') {
    json_out(200, ['ok' => true, 'message' => 'Thank you, we have received your message.']);
}

$name    = input_str('name', 120);
$email   = input_str('email', 190);
$subject = input_str('subject', 200);
$message = input_str('message', 5000);

$errors = [];
if ($name === '')                 { $errors['name'] = 'Please enter your name.'; }
if (!valid_email($email))         { $errors['email'] = 'Please enter a valid email address.'; }
if ($subject === '')              { $errors['subject'] = 'Please enter a subject.'; }
if (mb_strlen($message, 'UTF-8') < 10) { $errors['message'] = 'Please write at least 10 characters.'; }
if ($errors !== []) {
    json_out(422, ['ok' => false, 'error' => 'Please check the highlighted fields.', 'fields' => $errors]);
}

try {
    $pdo = db($config);
    prune_rate_limits($pdo);

    $ipHash = ip_hash($config);
    if (!rate_limit_ok($pdo, $config, 'contact:' . $ipHash)) {
        json_out(429, ['ok' => false, 'error' => 'Too many messages from you recently. Please try again in a few minutes.']);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO contact_messages (name, email, subject, message, ip_hash, user_agent)
         VALUES (:name, :email, :subject, :message, :ip, :ua)'
    );
    $stmt->execute([
        ':name'    => $name,
        ':email'   => $email,
        ':subject' => $subject,
        ':message' => $message,
        ':ip'      => $ipHash,
        ':ua'      => mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255, 'UTF-8'),
    ]);

    // Optional notification e-mail (only if a recipient is configured and mail() is available).
    if ($config['mail_to'] !== '' && function_exists('mail')) {
        $headers = "From: {$config['mail_from']}\r\nReply-To: {$email}\r\nContent-Type: text/plain; charset=UTF-8";
        @mail($config['mail_to'], '[SevaCoin] ' . mb_substr($subject, 0, 150, 'UTF-8'),
            "From: {$name} <{$email}>\n\n{$message}", $headers);
    }

    json_out(201, ['ok' => true, 'message' => 'Thank you, we have received your message and will reply soon.']);
} catch (Throwable $e) {
    error_log('[sevacoins] contact: ' . $e->getMessage());
    json_out(500, ['ok' => false, 'error' => 'Something went wrong on our side. Please try again later.']);
}
