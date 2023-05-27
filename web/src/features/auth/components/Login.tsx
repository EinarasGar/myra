import { Button } from "@mui/material";
import { useLoginMutation } from "@/app/myraApi";
import { LoginDetailsViewModel } from "@/models";

function Login() {
  const [login] = useLoginMutation();
  const details: LoginDetailsViewModel = {
    username: "einaras",
    password: "password",
  };
  return (
    <Button
      variant="contained"
      onClick={() => {
        login(details)
          .then((x) => {
            console.log(x);
          })
          .catch((err) => console.log(err));
      }}
    >
      Login
    </Button>
  );
}

export default Login;
