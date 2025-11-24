import { Route, Routes } from "react-router"
import Footer from "../components/layout/footer/Footer"
import Header from "../components/layout/header/Header"
import Hero from "../components/hero/Hero"
import styles from "./App.module.css"
import Login from "../components/auth/login/Login"

function App() {

  return (
    <>
      <div className={styles.layoutWrapper}>
        <Header />
        <main className={styles.mainContent}>
          <Routes>
            <Route path="/" element={<Hero />} />

            <Route path="/auth">
              <Route path='login' element={<Login />} />
            </Route>

          </Routes>
        </main>

        <Footer />
      </div>
    </>
  )
}

export default App
