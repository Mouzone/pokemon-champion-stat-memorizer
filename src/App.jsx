import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './index.css';

function getSpeedColor(speed) {
  let h = ((speed - 50) / (130 - 50)) * 120;
  if (h < 0) h = 0;
  if (h > 120) h = 120;
  return `hsl(${h}, 80%, 45%)`;
}

function App() {
  const [mode, setMode] = useState('carousel'); // 'carousel' | 'quiz'
  const [sortMethod, setSortMethod] = useState('usage'); // 'usage' | 'speed' | 'random'
  const [pokemonData, setPokemonData] = useState([]);
  
  // Carousel State
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Quiz State
  const [quizBlock, setQuizBlock] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}pokemon-data.json`)
      .then(res => res.json())
      .then(data => {
        setPokemonData(data);
      });
  }, []);

  const sortedData = useMemo(() => {
    let sorted = [...pokemonData];
    if (sortMethod === 'usage') {
      sorted.sort((a, b) => b.usagePct - a.usagePct);
    } else if (sortMethod === 'speed') {
      sorted.sort((a, b) => b.baseSpeed - a.baseSpeed);
    } else if (sortMethod === 'random') {
      // Simple random shuffle
      sorted.sort(() => Math.random() - 0.5);
    }
    return sorted;
  }, [pokemonData, sortMethod]);

  const generateQuizBlock = () => {
    // Weighted random selection based on usage
    let block = [];
    let pool = [...pokemonData];
    for (let i = 0; i < 5; i++) {
      if (pool.length === 0) break;
      const totalWeight = pool.reduce((sum, p) => sum + p.usagePct, 0);
      let randomNum = Math.random() * totalWeight;
      let selectedIdx = 0;
      for (let j = 0; j < pool.length; j++) {
        randomNum -= pool[j].usagePct;
        if (randomNum <= 0) {
          selectedIdx = j;
          break;
        }
      }
      block.push(pool[selectedIdx]);
      pool.splice(selectedIdx, 1);
    }
    setQuizBlock(block);
    setQuizIndex(0);
    setQuizAnswers({ min: '', neutral: '', max: '' });
    setQuizSubmitted(false);
  };

  useEffect(() => {
    if (mode === 'quiz' && pokemonData.length > 0 && quizBlock.length === 0) {
      generateQuizBlock();
    }
  }, [mode, pokemonData, quizBlock.length]);

  const handleNext = () => {
    if (mode === 'carousel') {
      setCurrentIndex(prev => Math.min(prev + 1, sortedData.length - 1));
    } else if (mode === 'quiz') {
      setQuizIndex(prev => Math.min(prev + 1, quizBlock.length - 1));
      setQuizAnswers({ min: '', neutral: '', max: '' });
      setQuizSubmitted(false);
    }
  };

  const handlePrev = () => {
    if (mode === 'carousel') {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'carousel' ? 'quiz' : 'carousel');
  };

  if (pokemonData.length === 0) return null;

  return (
    <>
      <header className="header">
        <button className="mode-toggle" onClick={toggleMode}>
          {mode === 'carousel' ? 'Switch to Quiz' : 'Switch to Carousel'}
        </button>
        
        {mode === 'carousel' && (
          <select 
            className="sort-select" 
            value={sortMethod} 
            onChange={(e) => {
              setSortMethod(e.target.value);
              setCurrentIndex(0);
            }}
          >
            <option value="usage">Sort by Usage</option>
            <option value="speed">Sort by Speed</option>
            <option value="random">Randomize</option>
          </select>
        )}
      </header>

      <main className="main-content">
        {mode === 'carousel' ? (
          <div className="carousel-container">
            <button className="nav-arrow" onClick={handlePrev} disabled={currentIndex === 0}>
              <ChevronLeft size={48} />
            </button>
            
            <div className="pokemon-display">
              <h2 className="pokemon-name">{sortedData[currentIndex].name}</h2>
              <img className="sprite" src={sortedData[currentIndex].sprite} alt={sortedData[currentIndex].name} />
              
              <div className="stats-container">
                <div className="stat-row">
                  <span className="stat-label">Min</span>
                  <span className="stat-value" style={{ color: getSpeedColor(sortedData[currentIndex].minSpeed) }}>
                    {sortedData[currentIndex].minSpeed}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Neutral</span>
                  <span className="stat-value" style={{ color: getSpeedColor(sortedData[currentIndex].neutralSpeed) }}>
                    {sortedData[currentIndex].neutralSpeed}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Max</span>
                  <span className="stat-value" style={{ color: getSpeedColor(sortedData[currentIndex].maxSpeed) }}>
                    {sortedData[currentIndex].maxSpeed}
                  </span>
                </div>
              </div>
            </div>

            <button className="nav-arrow" onClick={handleNext} disabled={currentIndex === sortedData.length - 1}>
              <ChevronRight size={48} />
            </button>
          </div>
        ) : (
          <div className="quiz-container">
            <div className="quiz-progress">
              {quizIndex + 1} / {quizBlock.length}
            </div>
            
            <div className="pokemon-display">
              <h2 className="pokemon-name">{quizBlock[quizIndex]?.name}</h2>
              <img className="sprite" src={quizBlock[quizIndex]?.sprite} alt="pokemon" />
              
              <div className="stats-container">
                <div className="stat-row">
                  <span className="stat-label">Min</span>
                  <input 
                    type="number" 
                    className="quiz-input" 
                    value={quizAnswers.min}
                    onChange={e => setQuizAnswers(prev => ({...prev, min: e.target.value}))}
                    disabled={quizSubmitted}
                  />
                </div>
                <div className="stat-row">
                  <span className="stat-label">Neutral</span>
                  <input 
                    type="number" 
                    className="quiz-input" 
                    value={quizAnswers.neutral}
                    onChange={e => setQuizAnswers(prev => ({...prev, neutral: e.target.value}))}
                    disabled={quizSubmitted}
                  />
                </div>
                <div className="stat-row">
                  <span className="stat-label">Max</span>
                  <input 
                    type="number" 
                    className="quiz-input" 
                    value={quizAnswers.max}
                    onChange={e => setQuizAnswers(prev => ({...prev, max: e.target.value}))}
                    disabled={quizSubmitted}
                  />
                </div>

                {!quizSubmitted ? (
                  <button 
                    className="quiz-submit" 
                    onClick={() => setQuizSubmitted(true)}
                    disabled={!quizAnswers.min || !quizAnswers.neutral || !quizAnswers.max}
                  >
                    Submit
                  </button>
                ) : (
                  <>
                    <div className="quiz-result" style={{ 
                      color: (
                        parseInt(quizAnswers.min) === quizBlock[quizIndex].minSpeed &&
                        parseInt(quizAnswers.neutral) === quizBlock[quizIndex].neutralSpeed &&
                        parseInt(quizAnswers.max) === quizBlock[quizIndex].maxSpeed
                      ) ? 'green' : 'red' 
                    }}>
                      {(
                        parseInt(quizAnswers.min) === quizBlock[quizIndex].minSpeed &&
                        parseInt(quizAnswers.neutral) === quizBlock[quizIndex].neutralSpeed &&
                        parseInt(quizAnswers.max) === quizBlock[quizIndex].maxSpeed
                      ) ? 'Correct!' : `Incorrect! ${quizBlock[quizIndex].minSpeed} / ${quizBlock[quizIndex].neutralSpeed} / ${quizBlock[quizIndex].maxSpeed}`}
                    </div>
                    {quizIndex < quizBlock.length - 1 ? (
                      <button className="quiz-next-block" onClick={handleNext}>Next Pokemon</button>
                    ) : (
                      <button className="quiz-next-block" onClick={generateQuizBlock}>Generate Next 5</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
