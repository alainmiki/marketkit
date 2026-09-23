import DBconnection from "./src/config/db.js"
import dotenv from "dotenv"
import mainApp from "./src/app.js"
dotenv.config()

await DBconnection()
const port =process.env.port

mainApp.listen(port,()=>{
    console.log(`Express server started at ${port} click : http://localhost:${port}`);
    
})
