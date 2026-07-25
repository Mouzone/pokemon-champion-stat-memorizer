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
    setQuizAnswers({ base: '', median: '', average: '' });
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
      setQuizAnswers({ base: '', median: '', average: '' });
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
                  <span className="stat-label">Base</span>
                  <span className="stat-value" style={{ color: getSpeedColor(sortedData[currentIndex].baseSpeed) }}>
                    {sortedData[currentIndex].baseSpeed}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Median</span>
                  <span className="stat-value" style={{ color: getSpeedColor(sortedData[currentIndex].medianSpeed) }}>
                    {sortedData[currentIndex].medianSpeed}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Average</span>
                  <span className="stat-value" style={{ color: getSpeedColor(sortedData[currentIndex].averageSpeed) }}>
                    {sortedData[currentIndex].averageSpeed}
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
                  <span className="stat-label">Base</span>
                  <input 
                    type="number" 
                    className="quiz-input" 
                    value={quizAnswers.base}
                    onChange={e => setQuizAnswers(prev => ({...prev, base: e.target.value}))}
                    disabled={quizSubmitted}
                  />
                </div>
                <div className="stat-row">
                  <span className="stat-label">Median</span>
                  <input 
                    type="number" 
                    className="quiz-input" 
                    value={quizAnswers.median}
                    onChange={e => setQuizAnswers(prev => ({...prev, median: e.target.value}))}
                    disabled={quizSubmitted}
                  />
                </div>
                <div className="stat-row">
                  <span className="stat-label">Average</span>
                  <input 
                    type="number" 
                    className="quiz-input" 
                    value={quizAnswers.average}
                    onChange={e => setQuizAnswers(prev => ({...prev, average: e.target.value}))}
                    disabled={quizSubmitted}
                  />
                </div>

                {!quizSubmitted ? (
                  <button 
                    className="quiz-submit" 
                    onClick={() => setQuizSubmitted(true)}
                    disabled={!quizAnswers.base || !quizAnswers.median || !quizAnswers.average}
                  >
                    Submit
                  </button>
                ) : (
                  <>
                    <div className="quiz-result" style={{ 
                      color: (
                        parseInt(quizAnswers.base) === quizBlock[quizIndex].baseSpeed &&
                        parseInt(quizAnswers.median) === quizBlock[quizIndex].medianSpeed &&
                        parseInt(quizAnswers.average) === quizBlock[quizIndex].averageSpeed
                      ) ? 'green' : 'red' 
                    }}>
                      {(
                        parseInt(quizAnswers.base) === quizBlock[quizIndex].baseSpeed &&
                        parseInt(quizAnswers.median) === quizBlock[quizIndex].medianSpeed &&
                        parseInt(quizAnswers.average) === quizBlock[quizIndex].averageSpeed
                      ) ? 'Correct!' : `Incorrect! ${quizBlock[quizIndex].baseSpeed} / ${quizBlock[quizIndex].medianSpeed} / ${quizBlock[quizIndex].averageSpeed}`}
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
