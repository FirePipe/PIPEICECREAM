import React, { useState, useEffect } from "react";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  CloudSnow, 
  CloudFog, 
  Clock, 
  MapPin, 
  Thermometer, 
  Loader2,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ShopConfig } from "../types";

interface WeatherClockWidgetProps {
  shopConfig: ShopConfig;
}

interface WeatherData {
  temp: number;
  code: number;
  city: string;
  loading: boolean;
  error: boolean;
}

export const WeatherClockWidget: React.FC<WeatherClockWidgetProps> = ({ shopConfig }) => {
  const [time, setTime] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherData>({
    temp: 26,
    code: 0,
    city: "Cali",
    loading: true,
    error: false,
  });

  // 1. Clock effect
  useEffect(() => {
    if (!shopConfig.mostrarReloj) return;
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [shopConfig.mostrarReloj]);

  // 2. Weather effect with IP-based lookup and browser Geolocation fallback
  useEffect(() => {
    if (!shopConfig.mostrarClima) return;

    let isMounted = true;

    const fetchWeather = async (lat: number, lon: number, cityName: string) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        if (!response.ok) throw new Error("Weather API error");
        const data = await response.json();
        
        if (isMounted) {
          const tempVal = Math.round(data.current_weather.temperature);
          const codeVal = data.current_weather.weathercode;
          
          const newWeather = {
            temp: tempVal,
            code: codeVal,
            city: cityName,
            loading: false,
            error: false,
          };
          
          setWeather(newWeather);

          // Save weather to 30-minute progressive cache
          try {
            localStorage.setItem(
              "pipe_ice_cream_weather_cache",
              JSON.stringify({
                data: { temp: tempVal, code: codeVal, city: cityName },
                timestamp: Date.now()
              })
            );
          } catch (cacheSaveErr) {
            console.warn("Weather cache save failed:", cacheSaveErr);
          }
        }
      } catch (err) {
        console.error("Error fetching weather details:", err);
        if (isMounted) {
          setWeather(prev => ({ ...prev, loading: false, error: true }));
        }
      }
    };

    const loadLocationAndWeather = async () => {
      // 1. Try progressive 30-minute cache first
      try {
        const cached = localStorage.getItem("pipe_ice_cream_weather_cache");
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // 30 minutes = 1800000 ms
          if (Date.now() - timestamp < 1800000 && data) {
            setWeather({
              temp: data.temp,
              code: data.code,
              city: data.city,
              loading: false,
              error: false,
            });
            return;
          }
        }
      } catch (cacheErr) {
        console.warn("Weather cache read failed:", cacheErr);
      }

      // Default to Cali, Colombia
      let lat = 3.4516;
      let lon = -76.5320;
      let city = "Cali";

      // Attempt fast IP-based geolocation first (frictionless, no popup)
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            lat = ipData.latitude;
            lon = ipData.longitude;
            city = ipData.city || "Cali";
          }
        }
      } catch (e) {
        console.log("Frictionless IP location failed or timed out, trying browser GPS...", e);
      }

      // Try browser GPS if available to get high-precision
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchWeather(pos.coords.latitude, pos.coords.longitude, city);
          },
          () => {
            // Error or block: Proceed with IP or Cali default
            fetchWeather(lat, lon, city);
          },
          { timeout: 4000 }
        );
      } else {
        fetchWeather(lat, lon, city);
      }
    };

    loadLocationAndWeather();

    return () => {
      isMounted = false;
    };
  }, [shopConfig.mostrarClima]);

  if (!shopConfig.mostrarReloj && !shopConfig.mostrarClima) {
    return null;
  }

  // Get weather details based on code
  const getWeatherDetails = (code: number) => {
    // Mapping weather codes based on WMO standard
    if (code === 0) {
      return {
        icon: <Sun className="h-5 w-5 text-amber-500 animate-spin" style={{ animationDuration: "12s" }} />,
        text: "Despejado",
        isHot: true,
      };
    } else if ([1, 2, 3].includes(code)) {
      return {
        icon: <Cloud className="h-5 w-5 text-sky-400 dark:text-zinc-400 animate-pulse" />,
        text: "Parcialmente Nublado",
        isHot: false,
      };
    } else if ([45, 48].includes(code)) {
      return {
        icon: <CloudFog className="h-5 w-5 text-gray-400" />,
        text: "Neblina",
        isHot: false,
      };
    } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
      return {
        icon: <CloudRain className="h-5 w-5 text-blue-400" />,
        text: "Lluvioso",
        isHot: false,
      };
    } else if ([95, 96, 99].includes(code)) {
      return {
        icon: <CloudLightning className="h-5 w-5 text-purple-400" />,
        text: "Tormenta",
        isHot: false,
      };
    } else if ([71, 73, 75, 85, 86].includes(code)) {
      return {
        icon: <CloudSnow className="h-5 w-5 text-sky-200 animate-bounce" />,
        text: "Nevado",
        isHot: false,
      };
    }
    return {
      icon: <Sun className="h-5 w-5 text-amber-500" />,
      text: "Soleado",
      isHot: true,
    };
  };

  const weatherDetails = getWeatherDetails(weather.code);

  // Dynamic ice cream recommendation sentence based on climate
  const getRecommendation = (temp: number) => {
    if (temp >= 28) {
      return {
        badge: "☀️ DÍA CALUROSO",
        color: "from-amber-500/15 to-red-500/5 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/30",
        desc: `¡Día caluroso, ideal para un helado! Hace calor (${temp}°C), refréscate al instante con sabores frutales de base Agua como Mango Biche o Fresa.`
      };
    } else if (temp >= 22) {
      return {
        badge: "⛅ CLIMA PERFECTO",
        color: "from-brand-500/15 to-amber-500/5 text-brand-800 dark:text-brand-300 border-brand-200 dark:border-zinc-800",
        desc: `¡Clima perfecto, ideal para un helado! Con una temperatura deliciosa de ${temp}°C, es el momento excelente para consentirte con un helado cremoso de Queso Bocadillo o Coco.`
      };
    } else {
      return {
        badge: "❄️ CLIMA FRESCO",
        color: "from-sky-500/15 to-indigo-500/5 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-950/30",
        desc: `¡Día fresco, ideal para un helado! Aunque la temperatura esté templada (${temp}°C), siempre es buen momento para disfrutar de un exquisito helado artesanal base Leche.`
      };
    }
  };

  const recommendation = getRecommendation(weather.temp);

  // Time formatter
  const formattedTime = time.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Bogota"
  });

  const formattedDate = time.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota"
  });

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
      {/* 1. Real-time Clock Card */}
      {shopConfig.mostrarReloj && (
        <div className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-between ${shopConfig.mostrarClima ? "md:col-span-4" : "md:col-span-12"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1">
              <Clock className="h-3 w-3 text-brand-500" />
              <span>Hora Local</span>
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400 border border-brand-100 dark:border-brand-900/20">
              Tiempo Real
            </span>
          </div>

          <div className="my-1.5">
            <span className="font-mono text-2xl sm:text-3xl font-black text-gray-800 dark:text-white tracking-tight tabular-nums block">
              {formattedTime}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium capitalize flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3 opacity-60" />
              {formattedDate}
            </span>
          </div>
        </div>
      )}

      {/* 2. Weather & Recommendation Widget */}
      {shopConfig.mostrarClima && (
        <div className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 md:flex md:items-center md:justify-between gap-4 ${shopConfig.mostrarReloj ? "md:col-span-8" : "md:col-span-12"}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-sky-500" />
                <span>Clima en {weather.city}</span>
              </span>
              
              <span className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded border uppercase ${recommendation.color}`}>
                {recommendation.badge}
              </span>
            </div>

            {weather.loading ? (
              <div className="flex items-center gap-1.5 py-1 text-xs text-gray-400 dark:text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Detectando clima de tu ubicación...</span>
              </div>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-gray-600 dark:text-zinc-350 font-medium">
                {recommendation.desc}
              </p>
            )}
          </div>

          {!weather.loading && (
            <div className="mt-3 md:mt-0 flex items-center gap-3 bg-gray-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-900 shrink-0 self-center">
              <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-850">
                {weatherDetails.icon}
              </div>
              <div>
                <span className="font-mono text-lg font-black text-gray-800 dark:text-white flex items-center gap-0.5 leading-none">
                  <Thermometer className="h-3.5 w-3.5 text-rose-500" />
                  {weather.temp}°C
                </span>
                <span className="text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 block mt-0.5 tracking-wider">
                  {weatherDetails.text}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
