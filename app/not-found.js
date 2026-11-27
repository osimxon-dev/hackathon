import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="state">
      <h3>Sahifa topilmadi</h3>
      <p>Manzil noto&apos;g&apos;ri yozilgan yoki sahifa o&apos;chirilgan.</p>
      <Link className="btn btn-primary btn-sm" href="/">Bosh sahifaga qaytish</Link>
    </div>
  );
}
