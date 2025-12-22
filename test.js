const RESEND_API_KEY = 're_cSMTofLv_2F1Acx6eRX1fNzrKFW58w9zF';

async function sendEmail() {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev', // Use your verified domain in production
      to: 'boxcloudstorage1@gmail.com',   // Replace with actual recipient
      subject: 'Test Email from Resend',
      html: '<h1>Hello!</h1><p>This is a test email sent via Resend API.</p>',
    }),
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data.id);
  } else {
    console.error('❌ Failed to send email');
    console.error('Status:', response.status);
    console.error('Error:', data);
  }

  return data;
}

sendEmail().catch(console.error);


