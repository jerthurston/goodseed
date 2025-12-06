import { archivoBlack } from '@/lib/fonts';
import Image from 'next/image';
import Link from 'next/link';



export default function NotFound() {
    return (
        <main className="not-found-section">
            <div className="not-found-container">
                <h1 className={`not-found-heading ${archivoBlack.variable}`}>404</h1>

                <Image
                    src="/images/404image.png"
                    alt="Illustration of a person looking lost in a thicket of plants"
                    className="not-found-image"
                    width={400}
                    height={300}
                    unoptimized
                />

                <p className="not-found-text">
                    Your journey has led you somewhere unfamiliar. Would you like to travel back{' '}
                    <Link href="/">home</Link> or <Link href="/seeds">browse</Link> among the foliage?
                </p>
            </div>
        </main>
    );
}
