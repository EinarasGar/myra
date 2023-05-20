import { AppBar, Button, Toolbar } from "@mui/material";
import { Link, Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          myra
          <Link to="/transactions">
            <Button variant="contained">Transaction</Button>
          </Link>
          <Link to="/transactions/add">
            <Button variant="contained">Transaction Add</Button>
          </Link>
          <Link to="/auth/login">
            <Button variant="contained">Login</Button>
          </Link>
          <Link to="/auth/logout">
            <Button variant="contained">Logout</Button>
          </Link>
        </Toolbar>
      </AppBar>
      <Outlet />
    </div>
  );
}

export default MainLayout;
