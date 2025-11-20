import { Route, Routes } from "react-router"
import Footer from "./components/layout/footer/Footer"
import Header from "./components/layout/header/Header"
import Hero from "./components/hero/Hero"

function App() {

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Hero />} />
      </Routes>


      <Footer />
    </>
  )
}

export default App
