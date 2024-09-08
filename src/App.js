import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import VotingSystem from './VotingSystem.json'; // This should be the ABI of your compiled contract

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [votingStatus, setVotingStatus] = useState('');
  const [newCandidate, setNewCandidate] = useState('');
  const [voteDuration, setVoteDuration] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState('');

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);

          // Replace with your contract address
          const contractAddress = '0xC0f203419eeca0521B16F9941E223Bc8F3d6FBDE'; 
          const votingSystem = new ethers.Contract(contractAddress, VotingSystem.abi, signer);
          setContract(votingSystem);

          // Load candidates
          const candidateCount = await votingSystem.getCandidateCount();
          const loadedCandidates = [];
          for (let i = 0; i < candidateCount; i++) {
            const candidate = await votingSystem.candidates(i);
            loadedCandidates.push({ id: i, name: candidate.name, voteCount: candidate.voteCount.toString() });
          }
          setCandidates(loadedCandidates);

          // Check voting status
          const currentTime = Math.floor(Date.now() / 1000);
          const votingStart = await votingSystem.votingStart();
          const votingEnd = await votingSystem.votingEnd();
          if (currentTime < votingStart) {
            setVotingStatus('Not started');
          } else if (currentTime >= votingStart && currentTime < votingEnd) {
            setVotingStatus('In progress');
          } else {
            setVotingStatus('Ended');
          }
        } catch (error) {
          console.error('Error initializing app:', error);
        }
      } else {
        console.log('Please install MetaMask!');
      }
    };

    init();
  }, []);

  const addCandidate = async () => {
    if (contract && newCandidate) {
      try {
        const tx = await contract.addCandidate(newCandidate);
        await tx.wait();
        const updatedCandidates = [...candidates, { id: candidates.length, name: newCandidate, voteCount: '0' }];
        setCandidates(updatedCandidates);
        setNewCandidate('');
      } catch (error) {
        console.error('Error adding candidate:', error);
      }
    }
  };

  const startVoting = async () => {
    if (contract && voteDuration) {
      try {
        const tx = await contract.startVoting(voteDuration);
        await tx.wait();
        setVotingStatus('In progress');
      } catch (error) {
        console.error('Error starting voting:', error);
      }
    }
  };

  const castVote = async () => {
    if (contract && selectedCandidate !== '') {
      try {
        const tx = await contract.vote(selectedCandidate);
        await tx.wait();
        // Update candidate vote count
        const updatedCandidates = candidates.map(c => 
          c.id === parseInt(selectedCandidate) 
            ? {...c, voteCount: (parseInt(c.voteCount) + 1).toString()} 
            : c
        );
        setCandidates(updatedCandidates);
      } catch (error) {
        console.error('Error casting vote:', error);
      }
    }
  };

  const endVoting = async () => {
    if (contract) {
      try {
        const tx = await contract.endVoting();
        await tx.wait();
        setVotingStatus('Ended');
        // Get the winning candidate
        const winningCandidateId = await contract.getWinningCandidate();
        alert(`Voting ended. Winning candidate ID: ${winningCandidateId}`);
      } catch (error) {
        console.error('Error ending voting:', error);
      }
    }
  };

  return (
    <div className="App">
      <h1>Blockchain Voting System</h1>
      <p>Connected Account: {account}</p>
      <p>Voting Status: {votingStatus}</p>

      <h2>Candidates</h2>
      <ul>
        {candidates.map(candidate => (
          <li key={candidate.id}>{candidate.name} - Votes: {candidate.voteCount}</li>
        ))}
      </ul>

      <h2>Admin Actions</h2>
      <div>
        <input 
          type="text" 
          value={newCandidate} 
          onChange={(e) => setNewCandidate(e.target.value)} 
          placeholder="New Candidate Name" 
        />
        <button onClick={addCandidate}>Add Candidate</button>
      </div>
      <div>
        <input 
          type="number" 
          value={voteDuration} 
          onChange={(e) => setVoteDuration(e.target.value)} 
          placeholder="Voting Duration (minutes)" 
        />
        <button onClick={startVoting}>Start Voting</button>
      </div>
      <button onClick={endVoting}>End Voting</button>

      <h2>Cast Your Vote</h2>
      <select value={selectedCandidate} onChange={(e) => setSelectedCandidate(e.target.value)}>
        <option value="">Select a candidate</option>
        {candidates.map(candidate => (
          <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
        ))}
      </select>
      <button onClick={castVote}>Vote</button>
    </div>
  );
}

export default App;