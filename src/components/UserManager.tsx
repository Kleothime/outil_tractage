'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile, parseArrondissements } from '@/types'

interface UserManagerProps {
  profiles: Profile[]
}

export default function UserManager({ profiles }: UserManagerProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // For creating new user
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newNom, setNewNom] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'responsable'>('responsable')
  const [newArrondissements, setNewArrondissements] = useState<number[]>([])

  // For editing
  const [editNom, setEditNom] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'responsable'>('responsable')
  const [editArrondissements, setEditArrondissements] = useState<number[]>([])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
    })

    if (authError) {
      alert('Erreur: ' + authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // Create profile
      await supabase.from('profiles').insert({
        id: authData.user.id,
        username: newUsername,
        nom: newNom,
        prenom: '',
        role: newRole,
        arrondissement: newArrondissements.join(','),
        is_active: true,
      })
    }

    setLoading(false)
    setShowCreateForm(false)
    setNewEmail('')
    setNewPassword('')
    setNewUsername('')
    setNewNom('')
    setNewRole('responsable')
    setNewArrondissements([])
    router.refresh()
  }

  const handleStartEdit = (profile: Profile) => {
    setEditingId(profile.id)
    setEditNom(profile.nom)
    setEditRole(profile.role)
    setEditArrondissements(parseArrondissements(profile.arrondissement))
  }

  const handleSaveEdit = async (profileId: string) => {
    setLoading(true)
    const supabase = createClient()

    await supabase
      .from('profiles')
      .update({
        nom: editNom,
        role: editRole,
        arrondissement: editArrondissements.join(','),
      })
      .eq('id', profileId)

    setLoading(false)
    setEditingId(null)
    router.refresh()
  }

  const toggleArrondissement = (arr: number, current: number[], setter: (arr: number[]) => void) => {
    if (current.includes(arr)) {
      setter(current.filter(a => a !== arr))
    } else {
      setter([...current, arr].sort((a, b) => a - b))
    }
  }

  const allArrondissements = Array.from({ length: 20 }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Create user button */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Créer un utilisateur
        </button>
      )}

      {/* Create user form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Créer un utilisateur</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'responsable')}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="responsable">Responsable</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arrondissements assignés
              </label>
              <div className="flex flex-wrap gap-2">
                {allArrondissements.map(arr => (
                  <button
                    key={arr}
                    type="button"
                    onClick={() => toggleArrondissement(arr, newArrondissements, setNewArrondissements)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      newArrondissements.includes(arr)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {arr}e
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Arrondissements
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {profiles.map(profile => {
              const profileArrondissements = parseArrondissements(profile.arrondissement)
              return (
                <tr key={profile.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === profile.id ? (
                      <input
                        type="text"
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        className="px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{profile.nom || profile.username}</div>
                        <div className="text-sm text-gray-500">@{profile.username}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === profile.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'admin' | 'responsable')}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="responsable">Responsable</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        profile.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {profile.role === 'admin' ? 'Admin' : 'Responsable'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === profile.id ? (
                      <div className="flex flex-wrap gap-1">
                        {allArrondissements.map(arr => (
                          <button
                            key={arr}
                            type="button"
                            onClick={() => toggleArrondissement(arr, editArrondissements, setEditArrondissements)}
                            className={`px-2 py-0.5 rounded text-xs border ${
                              editArrondissements.includes(arr)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            {arr}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {profileArrondissements.length > 0 ? (
                          profileArrondissements.map(arr => (
                            <span key={arr} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {arr}e
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">Aucun</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === profile.id ? (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleSaveEdit(profile.id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-900"
                        >
                          Sauver
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(profile)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
