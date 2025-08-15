import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardNew from "./pages/DashboardNew";

const AppTest = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<DashboardNew />} />
    </Routes>
  </BrowserRouter>
);

export default AppTest;
