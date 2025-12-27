/**
 * Debug page to test seed image loading
 * Access via: /debug/images
 */

'use client'

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function ImageDebugPage() {
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch some seeds to test their images
    fetch('/api/seed?limit=5')
      .then(res => res.json())
      .then(data => {
        console.log('Seeds data:', data);
        setSeeds(data.seeds || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch seeds:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading seeds for image testing...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Image Loading Debug Page</h1>
      <Image 
        src="https://www.sunwestgenetics.com/wp-content/uploads/2021/07/A-La-Mode-Feminized-Marijuana-Seeds-1-250x364.jpg"
        alt="Seed Placeholder"
        width={300}
        height={200}
      />
      <div>
        <h2>Testing Seed Images</h2>
        
       
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5' }}>
        <h3>Manual Test URLs</h3>
        <p>Test these common seed vendor image patterns:</p>
       
      </div>
    </div>
  );
}