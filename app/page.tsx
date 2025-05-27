import { Button } from "@/components/ui/button";
import { FiDownload } from "react-icons/fi";
import Social from "@/components/Social";
import Photo from "@/components/Photo";
import Stats from "@/components/Stats";


const Home = () => {
  return (
    <section className="h-full">
      <div className="container mx-auto h-full">
        <div className="flex flex-col gap-2 xl:flex-row items-center justify-between xl:pt-8 xl:pb-24">
        <div className="text-center xl:text-left order-2 xl:order-none">
          <h1 className="h1 mb-6"> 
   
          </h1>
          
        <div className="flex flex-col xl:flex-row items-center gap-8">
          <Button variant="outline"
                  className="uppercase flex items-center gap-2">
            <span>Start Quiz</span>
          </Button>
          <div className="mb-8 xl:mb-0">
          {/* <Social 
          containerStyles="flex gap-6"
          iconStyles="w-9 h-9 border border-accent rounded-full flex justify-center items-center text-center text-base 
          hover:bg-accent hover:text-primary hover:transition-all duration-500"/> */}
          </div>
        </div>
        </div>
        <div className="order-1 xl:order-none mb-8 xl:mb-0 ">
        {/* <Photo /> */}
        </div>
        </div>
      </div>
      </section>
  );
};

export default Home;