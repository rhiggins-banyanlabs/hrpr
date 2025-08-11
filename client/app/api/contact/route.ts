// app/api/contact/route.ts

import { NextResponse } from 'next/server';

import sgMail from '@sendgrid/mail';



export const runtime = 'nodejs'; // SendGrid needs the Node runtime



// Optional: keep GET for quick health checks in your browser

export async function GET() {

  return NextResponse.json({ ok: true, via: 'GET' });

}



type Body = {

  fullName?: string;

  organization?: string;

  email?: string;

  phone?: string;

};



function isValidEmail(v?: string) {

  if (!v) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

}



export async function POST(req: Request) {

  try {

    // If your form sends JSON (see page.tsx below)

    const { fullName, organization, email, phone } = (await req.json()) as Body;



    // Basic validation

    if (!fullName || !isValidEmail(email)) {

      return NextResponse.json(

        { error: 'Full name and a valid email are required.' },

        { status: 400 }

      );

    }



    // Ensure key exists (fail fast with a helpful error)

    const key = process.env.SENDGRID_API_KEY;

    if (!key) {

      return NextResponse.json(

        { error: 'Missing SENDGRID_API_KEY environment variable.' },

        { status: 500 }

      );

    }



    sgMail.setApiKey(key);



    const msg = {

      to: 'hrpr@banyanlabs.io',   // ✅ change if needed

      from: 'hrpr@banyanlabs.io', // ✅ must be a verified sender/domain in SendGrid

      subject: 'New Contact Submission from Harper',

      text: `Full Name: ${fullName}

Organization: ${organization ?? ''}

Email: ${email ?? ''}

Phone: ${phone ?? ''}`,

    };



    await sgMail.send(msg);



    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });

  } catch (err: any) {

    // Helpful logging while developing

    console.error('SendGrid/Route Error:', err?.response?.body || err || 'Unknown error');

    return NextResponse.json(

      { error: 'Failed to send email' },

      { status: 500 }

    );

  }

}