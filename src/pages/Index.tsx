import Dashboard from "./Dashboard";

export default function Index() {
  // The route protection is handled in App.tsx
  // If user reaches here, they are authenticated
  return <Dashboard />;
}
