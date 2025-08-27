    "use client";

    import { useEffect, useState, useRef, Suspense } from "react";
    import axios from "axios";
    import Image from "next/image";
    import { API_BASE_URL } from "../../lib/config";
    import { useRouter, useSearchParams } from "next/navigation";

    function TictactoeGame() {
  const [topCategories, setTopCategories] = useState<{ name: string; slug: string; categoryId: number }[]>([]);
  const [leftCategories, setLeftCategories] = useState<{ name: string; slug: string; categoryId: number }[]>([]);
  const [pairs, setPairs] = useState<{ categories: string[]; players: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [activePair, setActivePair] = useState<string[] | null>(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [player1Wins, setPlayer1Wins] = useState(0);
  const [player2Wins, setPlayer2Wins] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
    const [drawRequested, setDrawRequested] = useState<string | null>(null); // 'X' or 'O' who requested draw
  const [showDrawConfirmation, setShowDrawConfirmation] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [turnTimer, setTurnTimer] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [pendingWin, setPendingWin] = useState<null | 'Player 1' | 'Player 2'>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const league = searchParams?.get('league') || 'bundesliga'; // Default to bundesliga if no league specified

      // 3x3 grid state: { locked, image, answer }
      type CellState = { locked: boolean; image: 'X' | 'O' | null; answer: string | null };
      const [cellStates, setCellStates] = useState<CellState[][]>(
        Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ locked: false, image: null, answer: null })))
      );
      const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
      const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

      useEffect(() => {
        let gridLoaded = false;
        let playersLoaded = false;

        console.log(`🎯 Loading TicTacToe grid for league: ${league}`);
        axios.get(`${API_BASE_URL}/tictactoe/categories/grid?league=${league}`)
          .then(res => {
            setTopCategories(res.data.top);
            setLeftCategories(res.data.left);
            setPairs(res.data.pairs);
            setLoading(false);
            gridLoaded = true;
            if (playersLoaded) setDataReady(true);
          })
          .catch(err => {
            setError("Failed to load grid categories");
            setLoading(false);
          });
        // No need to fetch players separately - grid contains all valid player-category pairs
        playersLoaded = true;
        if (gridLoaded) setDataReady(true);
      }, []);

      // Filter players for the modal when modal is open, activePair or search changes
      useEffect(() => {
        if (!modalOpen || !activePair) return;
        setPlayersLoading(true);
        setPlayersError(null);
        
        // Find the valid players for this cell from the grid data
        const pair = findPair(
          { name: activePair[0], slug: '', categoryId: 0 }, 
          { name: activePair[1], slug: '', categoryId: 0 }
        );
        
        if (pair) {
          // Filter the valid players by search term
          const filtered = pair.players.filter(playerName =>
            !search || playerName.toLowerCase().includes(search.toLowerCase())
          );
          setPlayers(filtered.map(playerName => ({ playerName })));
        } else {
          setPlayers([]);
        }
        
        setPlayersLoading(false);
      }, [modalOpen, search, activePair, pairs]);

      // Timer effect: start/reset on turn change, but only if dataReady
      useEffect(() => {
        if (!dataReady) return; // Don't start timer until data is ready
        setTurnTimer(20);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTurnTimer(prev => {
            if (prev === 1) {
              clearInterval(timerRef.current!);
              setShowSkipConfirmation(false); // close skip modal if open
              setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
              setModalOpen(false);
              setSearch("");
              setActivePair(null);
              setActiveCell(null);
              return 20;
            }
            return prev - 1;
          });
        }, 1000);
        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
        };
      }, [currentTurn, winner, draw, dataReady]);

      if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading categories...</div>;
      }
      if (error || topCategories.length < 3 || leftCategories.length < 3) {
        return <div className="min-h-screen flex items-center justify-center text-red-400">{error || "Not enough categories in DB (need at least 6)"}</div>;
      }

      // Helper to find the pair object for a given cell
      function findPair(cat1: { name: string; slug: string; categoryId: number }, cat2: { name: string; slug: string; categoryId: number }) {
        return pairs.find(
          p => (p.categories[0] === cat1.name && p.categories[1] === cat2.name) ||
               (p.categories[1] === cat1.name && p.categories[0] === cat2.name)
        );
      }

      // Helper to get category icon path based on categoryId and league
      function getCategoryIconPath(categoryId: number): string {
        // Base path for tictactoe images
        const basePath = '/tictactoeimg';
        
        // Determine which league folder to use based on current league
        let leagueFolder = 'bundesligaicons'; // Default
        
        if (league === 'superlig') {
          leagueFolder = 'slicons';
        } else if (league === 'laliga') {
          leagueFolder = 'laligaicons';
        } else if (league === 'premier-lig') {
          leagueFolder = 'plicons';
        } else if (league === 'serie-a') {
          leagueFolder = 'serieaicons';
        }
        // Return the image path using the categoryId directly
        return `${basePath}/${leagueFolder}/${categoryId}.png`;
      }

      // Helper: check for win
      function checkWin(cells: CellState[][], sign: 'X' | 'O'): boolean {
        // Rows
        for (let i = 0; i < 3; i++) {
          if (cells[i][0].image === sign && cells[i][1].image === sign && cells[i][2].image === sign) return true;
        }
        // Columns
        for (let j = 0; j < 3; j++) {
          if (cells[0][j].image === sign && cells[1][j].image === sign && cells[2][j].image === sign) return true;
        }
        // Diagonals
        if (cells[0][0].image === sign && cells[1][1].image === sign && cells[2][2].image === sign) return true;
        if (cells[0][2].image === sign && cells[1][1].image === sign && cells[2][0].image === sign) return true;
        return false;
      }

      // Helper: check for draw
      function checkDraw(cells: CellState[][]): boolean {
        return cells.flat().every(cell => cell.locked);
      }

      // On cell click, open modal and store cell coordinates
      function handleCellClick(row: number, col: number) {
        if (cellStates[row][col].locked) return;
        const pair = findPair(topCategories[col], leftCategories[row]);
        if (pair) {
          console.log('Valid answers for', topCategories[col].name, '+', leftCategories[row].name, ':', pair.players);
        }
        setModalOpen(true);
        setActivePair([topCategories[col].name, leftCategories[row].name]);
        setActiveCell({ row, col });
      }

      // Reset board and fetch new grid
      function resetBoard() {
        setCellStates(Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ locked: false, image: null, answer: null }))));
        setCurrentTurn('X');
        setPlayer1Score(0);
        setPlayer2Score(0);
        setModalOpen(false);
        setSearch("");
        setActivePair(null);
        setActiveCell(null);
        setLoading(true);
        console.log(`🔄 Resetting board and loading new grid for league: ${league}`);
        axios.get(`${API_BASE_URL}/tictactoe/categories/grid?league=${league}`)
          .then(res => {
            setTopCategories(res.data.top);
            setLeftCategories(res.data.left);
            setPairs(res.data.pairs);
            setLoading(false);
          })
          .catch(err => {
            setError("Failed to load grid categories");
            setLoading(false);
          });
      }

      // On player select in modal
      function handlePlayerSelect(playerName: string) {
        if (!activePair || !activeCell) return;
        // Find valid answers for this cell
        const pair = findPair(
          { name: activePair[0], slug: '', categoryId: 0 }, 
          { name: activePair[1], slug: '', categoryId: 0 }
        );
        if (pair && pair.players.includes(playerName)) {
          // Correct answer: lock cell, set image, set answer, alternate turn, increment score
          setCellStates(prev => {
            const newStates = prev.map(row => row.map(cell => ({ ...cell })));
            newStates[activeCell.row][activeCell.col] = {
              locked: true,
              image: currentTurn,
              answer: playerName
            };
            // Check for win after updating the cell
            if (checkWin(newStates, currentTurn)) {
              const winnerName = currentTurn === 'X' ? 'Player 1' : 'Player 2';
              setPendingWin(winnerName);
              setTimeout(() => {
                setWinner(winnerName);
                if (currentTurn === 'X') {
                  setPlayer1Wins(prev => {
                const updated = prev + 1;
                if (updated === 3) {
                  setTimeout(() => router.push('/'), 2000); // Redirect to homepage after showing modal
                } else {
                  setTimeout(() => {
                    setWinner(null);
                    resetBoard();
                  }, 2000);
                }
                return updated;
              });
            } else {
              setPlayer2Wins(prev => {
                const updated = prev + 1;
                if (updated === 3) {
                setTimeout(() => router.push('/'), 2000);
                  } else {
                setTimeout(() => {
                  setWinner(null);
                  resetBoard();
                }, 2000); // Winner modal duration
                }
                return updated;
              });
            }
            setPendingWin(null);
              }, 5000); // Show grid for 5 seconds before modal
            } else if (checkDraw(newStates)) {
              setDraw(true);
              setTimeout(() => {
                setDraw(false);
                resetBoard();
              }, 2000);
            }
            // Only increment per-round score if not a win
            // if (currentTurn === 'X') {
            //   setPlayer1Score(s => s + 1);
            // } else {
            //   setPlayer2Score(s => s + 1);
            // }
            return newStates;
          });
          setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
          setModalOpen(false);
          setSearch("");
          setActivePair(null);
          setActiveCell(null);
        } else {
          // Wrong answer: close modal and skip turn
          setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
          setModalOpen(false);
          setSearch("");
          setActivePair(null);
          setActiveCell(null);
        }
      }

      function handleSkip() {
        setShowSkipConfirmation(true);
      }

      function confirmSkip(confirmed: boolean) {
        setShowSkipConfirmation(false);
        if (confirmed) {
          setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
          setModalOpen(false);
          setSearch("");
          setActivePair(null);
          setActiveCell(null);
        }
        // If not confirmed, do nothing (let user try again)
      }

        // Handle draw request
  function handleDrawRequest() {
    setDrawRequested(currentTurn);
    // Skip current player's turn and show draw request to other player
    setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
    setShowDrawConfirmation(true);
  }

  // Handle second player's draw confirmation
  function handleDrawConfirmation(confirmed: boolean) {
    setShowDrawConfirmation(false);
    setDrawRequested(null);
    
    if (confirmed) {
      // Second player agreed to draw
      setDraw(true);
      setTimeout(() => {
        setDraw(false);
        resetBoard();
      }, 2000);
    }
    // If second player declined, game continues normally with current turn
  }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#181A2A] text-white py-2">
          {/* Header */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <span className="bg-[#222] px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                <span>PLAYER 1</span>
                <span className="bg-green-700 px-2 py-1 rounded ml-2">{player1Wins}-{player2Wins}</span>
                <span>PLAYER 2</span>
              </span>
              <span className="bg-green-400 text-black font-bold px-3 py-1 rounded ml-2 min-w-[48px] text-lg flex items-center justify-center" style={{letterSpacing: '1px'}}>
                {`0:${turnTimer.toString().padStart(2, '0')}`}
              </span>
            </div>
            <div className="flex gap-4 items-center">
              <span className="bg-white text-black font-bold rounded px-4 py-2 text-sm border border-[#e5e7eb] shadow-sm" style={{minWidth: '110px', letterSpacing: '1px'}}>
                {currentTurn === 'X' ? 'PLAYER 1 TURN' : 'PLAYER 2 TURN'}
              </span>
              <span className="bg-red-500 px-4 py-2 rounded text-sm font-bold cursor-pointer" onClick={handleSkip}>SKIP</span>
              <button 
                onClick={handleDrawRequest}
                className="bg-orange-400 px-5 py-2 rounded text-sm font-bold cursor-pointer hover:bg-orange-500 transition-colors"
              >
                REQUEST DRAW
              </button>
            </div>
          </div>
          <div className="w-full max-w-5xl rounded-lg shadow-lg overflow-hidden bg-[#23233a] p-4">
            {/* Top row: categories (top headers) */}
            <div className="flex mb-2" style={{ height: 120 }}>
              <div className="w-[180px] flex flex-col items-center justify-center">
                {/* KI-TAKA-TOE Logo in top-left corner */}
                <Image
                  src="/tictactoeimg/kitakatloe-logo.png"
                  alt="KI-TAKA-TOE"
                  width={64}
                  height={64}
                  className="mb-3"
                  style={{ objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-sm text-white text-center font-semibold">KI-TAKA-TOE</span>
              </div>
              {topCategories.map((cat, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-center h-full px-1">
                  <span className="text-center w-full break-words leading-tight text-sm font-bold mb-2" style={{ lineHeight: '1.2' }}>
                    {cat.name}
                  </span>
                  <Image
                    src={getCategoryIconPath(cat.categoryId)}
                    alt={cat.name}
                    width={56}
                    height={56}
                    className="mb-2"
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
            {/* 3 rows: each with left category and 3 grid boxes */}
            {leftCategories.map((leftCat, row) => (
              <div key={row} className="flex items-center" style={{ minHeight: 120 }}>
                <div className="w-[180px] flex flex-col items-center justify-center px-2">
                  <span className="text-sm font-bold text-center w-full break-words leading-tight mb-2" style={{ lineHeight: '1.2' }}>
                    {leftCat.name}
                  </span>
                  <Image
                    src={getCategoryIconPath(leftCat.categoryId)}
                    alt={leftCat.name}
                    width={56}
                    height={56}
                    className="mb-2"
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                {topCategories.map((topCat, col) => {
                  const pair = findPair(topCat, leftCat);
                  const cell = cellStates[row][col];
                  return (
                    <div
                      key={col}
                      className={`flex-1 flex flex-col items-center justify-center border-2 border-[#2e2e4d] rounded-none min-h-[80px] max-h-[100px] aspect-square transition text-base font-bold ${cell.locked ? 'bg-green-500 cursor-not-allowed' : 'bg-green-600 cursor-pointer hover:bg-green-700'}`}
                      onClick={() => handleCellClick(row, col)}
                    >
                      {cell.locked ? (
                        <>
                          <Image
                            src={cell.image === 'X' ? "/cross_image-tictactoe.png" : "/circle_image-tictactoe.png"}
                            alt={cell.image === 'X' ? 'X' : 'O'}
                            width={48}
                            height={48}
                            className="mb-1"
                          />
                          <span className="text-xs text-green-200 mt-1 text-center break-words px-1" style={{ maxWidth: '100%', lineHeight: '1.1' }}>
                            {cell.answer}
                          </span>
                        </>
                      ) : (
                        <>
                          <Image
                            src="/unselected_image_tictactoe.png"
                            alt="Unselected"
                            width={64}
                            height={64}
                            style={{ opacity: 0.7 }}
                          />
                          {/* {pair && <span className="text-xs text-green-200 mt-1">{pair.players.length} players</span>} */}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Modal */}
          {modalOpen && activePair && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
              <div className="bg-white text-black rounded-xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col">
                <h2 className="text-xl font-bold mb-2">Player Search</h2>
                <div className="text-sm mb-2 text-gray-700">Find a player for <b>{activePair[0]}</b> + <b>{activePair[1]}</b></div>
                <input
                  className="w-full border-2 border-lime-300 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-lime-400 text-lg"
                  placeholder="Search player..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <div className="flex-1 overflow-y-auto max-h-48 mb-4 bg-gray-100 rounded-md p-2">
                  {playersLoading ? (
                    <div className="text-gray-500 text-center py-4">Loading players...</div>
                  ) : playersError ? (
                    <div className="text-red-500 text-center py-4">{playersError}</div>
                  ) : players.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No players found.</div>
                  ) : (
                    players.map((p, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-1 py-1 px-2 hover:bg-gray-200 rounded cursor-pointer"
                        onClick={() => p.playerName && handlePlayerSelect(p.playerName)}
                      >
                        <span className="font-bold">{p.playerName || 'Unknown Player'}</span>
                      </div>
                    ))
                  )}
                </div>
                {/* <div className="text-xs text-gray-500 mb-2">Player data was last updated on <b>5th Mar 2025</b></div> */}
                <button
                  className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded font-semibold"
                  onClick={() => { setModalOpen(false); setSearch(""); setActivePair(null); setActiveCell(null); }}
                >
                  Cancel
                </button>
                <button
                  className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-gray-700"
                  onClick={() => { setModalOpen(false); setSearch(""); setActivePair(null); setActiveCell(null); }}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>
            </div>
          )}

          {/* Winner Modal */}
          {winner && !pendingWin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
              <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative flex flex-col items-center">
                <h2 className="text-3xl font-bold mb-4">{winner} Wins!</h2>
                <p className="mb-6">A new game will start shortly...</p>
              </div>
            </div>
          )}
          {/* Draw Modal */}
          {draw && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
              <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative flex flex-col items-center">
                <h2 className="text-3xl font-bold mb-4">It's a Draw!</h2>
                <p className="mb-6">A new game will start shortly...</p>
              </div>
            </div>
          )}

                {/* Draw Request Confirmation Modal */}
      {showDrawConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Draw Request</h2>
            <p className="mb-6">
              {drawRequested === 'X' ? 'Player 1' : 'Player 2'} has requested a draw. Do you want to accept?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleDrawConfirmation(true)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => handleDrawConfirmation(false)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
        {/* Skip Confirmation Modal */}
      {showSkipConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Are you sure?</h2>
            <p className="mb-6">Do you really want to skip your turn?</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => confirmSkip(true)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => confirmSkip(false)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      );
    }

    // Main page component with Suspense wrapper
    export default function TictactoePage() {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
          <TictactoeGame />
        </Suspense>
      );
    } 