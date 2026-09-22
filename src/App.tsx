import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./api";
import Layout from "./components/Layout";
import Actions from "./pages/Actions";
import Alerts from "./pages/Alerts";
import AssessmentDetail from "./pages/AssessmentDetail";
import Assessments from "./pages/Assessments";
import Assets from "./pages/Assets";
import Controls from "./pages/Controls";
import Dashboard from "./pages/Dashboard";
import Evidence from "./pages/Evidence";
import Login from "./pages/Login";
import Organisations from "./pages/Organisations";
import Reports from "./pages/Reports";
import RiskRegister from "./pages/RiskRegister";

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/:id" element={<AssessmentDetail />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/risk-register" element={<RiskRegister />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/organisations" element={<Organisations />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
