import React from 'react'
import HeroSection from '../Components/HeroSection'
import About from '../Components/About'
import Qualities from '../Components/Qualities'
import WhoAreWe from '../Components/WhoAreWe'
import Team from '../Components/Team'
import Reservation from '../Components/Reservation'
import Footer from '../Components/Footer'
import ChatWidget from "../Components/ChatWidget";

const Home = () => {
  return (
    <>
      <HeroSection/>
      <About/>
      <Qualities/>
      <WhoAreWe/>
      <ChatWidget />
      <Team/>
      <Reservation/>
      <Footer/>
    </>
  )
}

export default Home