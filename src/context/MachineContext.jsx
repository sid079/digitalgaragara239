import { createContext, useContext, useState, useEffect } from 'react'

const MachineContext = createContext(null)

export function MachineProvider({ children }) {
  const [grade, setGrade] = useState(() => localStorage.getItem('sw_grade') || '')
  const [machineId, setMachineId] = useState(() => localStorage.getItem('sw_machine_id') || '')

  function setMachine(newGrade, newMachineId) {
    setGrade(newGrade)
    setMachineId(newMachineId)
    localStorage.setItem('sw_grade', newGrade)
    localStorage.setItem('sw_machine_id', newMachineId)
  }

  function clearMachine() {
    setGrade('')
    setMachineId('')
    localStorage.removeItem('sw_grade')
    localStorage.removeItem('sw_machine_id')
  }

  const isConfigured = Boolean(grade && machineId)

  return (
    <MachineContext.Provider value={{ grade, machineId, setMachine, clearMachine, isConfigured }}>
      {children}
    </MachineContext.Provider>
  )
}

export function useMachine() {
  const context = useContext(MachineContext)
  if (!context) throw new Error('useMachine must be used within MachineProvider')
  return context
}
