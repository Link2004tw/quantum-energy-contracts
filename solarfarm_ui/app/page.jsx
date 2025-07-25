"use client";

import React from 'react';
import Card from './components/Layout/Card';
import SigningForm from './components/Layout/SigningForm';
import UnderlineButton from './components/UI/UnderlineButton';
//import Card from '../components/Card';
//import SigningForm from '../components/SigningForm';
//import UnderlineButton from '../components/UnderlineButton';

export default function Home() {
  const handleSignSubmit = (data) => {
    console.log('Sign form submitted:', data);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      // style={{ backgroundImage: "url('/homeimage.jpeg')" }}
    >
      <main className="max-w-5xl my-12 mx-auto px-8 flex flex-col items-center">
        {/* Hero Section */}
        <section className="text-center py-16">
          <h1 className="text-4xl font-bold text-primary-600 mb-4">
            Welcome to Solar Farm
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl">
            Monitor and manage your solar energy systems with ease. Join us to
            harness the power of the sun!
          </p>
          <div className=" flex justify-center items-center">
          <UnderlineButton
            title="Get Started"
            onClick={() => window.scrollTo({ top: document.getElementById('cta').offsetTop, behavior: 'smooth' })}
          />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 w-full">
          <h2 className="text-2xl font-bold text-primary-600 mb-8 text-center">
            Why Choose Solar Farm?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
            <Card title="Real-Time Monitoring">
              <p className='text-secondary-700 font-bold'>Track your solar farm's performance with live data updates.</p>
            </Card>
            <Card title="User-Friendly Dashboard">
              <p className='text-secondary-700 font-bold'>Access intuitive controls and insights for efficient management.</p>
            </Card>
            <Card title="Secure Blockchain Integration">
              <p className='text-secondary-700 font-bold'>Leverage Ethereum for transparent and secure transactions.</p>
            </Card>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section id="cta" className="py-16 w-full flex justify-center">
          <Card title="Join Us Today">
         <SigningForm mode='signUp' onSubmit={handleSignSubmit} />
         </Card>
        </section>
      </main>
    </div>
  );
}