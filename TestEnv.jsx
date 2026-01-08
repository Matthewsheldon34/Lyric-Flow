// TestEnv.jsx
export default function TestEnv() {
  return (
    <div>
      <pre>VITE_API_URL: {import.meta.env.VITE_API_URL}</pre>
      <pre>PROD: {import.meta.env.PROD ? 'true' : 'false'}</pre>
      <pre>DEV: {import.meta.env.DEV ? 'true' : 'false'}</pre>
    </div>
  );
}