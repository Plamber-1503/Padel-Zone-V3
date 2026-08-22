import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { padelService, useOpenMatches, useJoinOpenMatch, useAddComment, useUpdatePost, useDeletePost, useDeleteComment, useUsers, useDemoUsers, useCreateDemoComment } from '@/api/padelService';
import { toast, confirmToast } from '@/lib/toast';
import { Heart, MessageCircle, Share2, MapPin, Zap, Trophy, Send, Building2, Pencil, Trash2, X, Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PostCard({ post, onPostUpdated, isDark: isDarkOverride }) {
  const { user } = useAuth();
  const { isDark: globalIsDark } = useTheme();
  // Paneles con tema propio (club, admin) pasan isDark explícito para no
  // depender del tema global de la app — si no lo pasan, sigue como antes.
  const isDark = typeof isDarkOverride === 'boolean' ? isDarkOverride : globalIsDark;
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editError, setEditError] = useState('');
  const { data: openMatches = [] } = useOpenMatches();
  const joinMatchMutation = useJoinOpenMatch();
  const addCommentMutation = useAddComment();
  const updatePostMutation = useUpdatePost();
  const deletePostMutation = useDeletePost();
  const deleteCommentMutation = useDeleteComment();

  const likes = post.likes || [];
  const isLiked = likes.includes(user?.id);
  const comments = post.comments || [];
  const isOwnPost = post.author_id === user?.id;

  // El club de la cancha dueña de este post — solo para saber si desactivó
  // comentarios en sus publicaciones (el club no modera comentarios ajenos,
  // cada quien borra únicamente el suyo). Posts sin cancha asociada
  // (jugador común) nunca quedan bloqueados.
  const club = post.courts?.clubs || null;
  const commentsAllowed = club ? club.allow_comments !== false : true;

  // Usuarios etiquetados — se resuelven contra el listado público, ya que
  // tagged_user_ids es solo un array de ids, no viene con nombre/foto.
  const { data: allUsers = [] } = useUsers();
  const taggedUsers = (post.tagged_user_ids || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);

  // Auditoría 2026-08-19: la tabla posts no guarda nombre ni foto del autor
  // (solo author_id), pero acá se leían post.author_name/author_avatar — que
  // solo existen en los posts de mockData. Resultado: TODA publicación real
  // salía sin nombre y con el avatar genérico. Se resuelve contra el mismo
  // listado público que ya se usa para los etiquetados.
  // Comentar como usuario demo: solo se cargan (y solo se ofrece la opción)
  // si quien mira tiene el permiso para manejar usuarios demo.
  const canUseDemoUsers = user?.role === 'admin' || (user?.staff_permissions || []).includes('demo_users');
  const { data: demoUsers = [] } = useDemoUsers(canUseDemoUsers);
  const availableDemoUsers = demoUsers.filter(u => u.is_visible);
  const createDemoComment = useCreateDemoComment();
  const [commentAsId, setCommentAsId] = useState('');

  const author = allUsers.find(u => u.id === post.author_id);
  const authorName = author?.full_name || post.author_name || 'Jugador';
  const authorAvatar = author?.avatar_url || post.author_avatar;

  const linkedMatch = post.match_id ? openMatches.find(m => m.id === post.match_id) : null;
  const isUserJoined = linkedMatch?.joined_players?.some(p => p.name === user?.full_name);
  const isMatchFull = linkedMatch && (linkedMatch.joined_players?.length || 0) >= linkedMatch.max_players;

  const handleLike = async () => {
    try {
      await padelService.toggleLikePost(post.id);
      if (onPostUpdated) onPostUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinMatch = async () => {
    if (!post.match_id) return;
    try {
      await joinMatchMutation.mutateAsync(post.match_id);
      if (onPostUpdated) onPostUpdated();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentError('');

    // Comentar a nombre de un usuario demo (solo para el equipo con permiso).
    if (commentAsId) {
      createDemoComment.mutate(
        { authorId: commentAsId, postId: post.id, content: commentText },
        {
          onSuccess: () => {
            setCommentText('');
            if (onPostUpdated) onPostUpdated();
          },
          onError: (err) => setCommentError(err.message)
        }
      );
      return;
    }

    addCommentMutation.mutate(
      { postId: post.id, text: commentText },
      {
        onSuccess: () => {
          setCommentText('');
          if (onPostUpdated) onPostUpdated();
        },
        onError: (err) => setCommentError(err.message)
      }
    );
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    setEditError('');
    updatePostMutation.mutate(
      { postId: post.id, content: editContent, media_url: post.media_url },
      {
        onSuccess: () => {
          setIsEditingPost(false);
          if (onPostUpdated) onPostUpdated();
        },
        onError: (err) => setEditError(err.message)
      }
    );
  };

  const handleDeletePost = () => {
    confirmToast('¿Eliminar esta publicación? No se puede deshacer.', () => {
      deletePostMutation.mutate(post.id, {
        onSuccess: () => { if (onPostUpdated) onPostUpdated(); },
        onError: (err) => toast.error(err.message)
      });
    });
  };

  const handleDeleteComment = (commentId) => {
    confirmToast('¿Eliminar este comentario?', () => {
      deleteCommentMutation.mutate(commentId, {
        onSuccess: () => { if (onPostUpdated) onPostUpdated(); },
        onError: (err) => toast.error(err.message)
      });
    });
  };

  const formattedDate = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })
    : 'recientemente';

  return (
    <div className={`rounded-2xl overflow-hidden shadow-md transition-all border ${
      isDark ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-md hover:border-slate-700/80' : 'bg-white border-slate-200/90 hover:border-slate-300'
    }`}>
      
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.author_id}`}>
            <img
              src={authorAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
              alt=""
              className="w-10 h-10 rounded-xl object-cover border border-slate-300 dark:border-slate-700"
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link to={`/profile/${post.author_id}`} className={`font-bold text-sm hover:underline ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {authorName}
              </Link>
              {post.author_type === 'court' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border flex items-center gap-1 ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  <Building2 className="w-2.5 h-2.5" /> Club Oficial
                </span>
              )}
            </div>
            
            <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>{formattedDate}{post.updated_at && ' · editado'}</span>
              {post.court_name && (
                <>
                  <span>•</span>
                  <Link to={`/court/${post.court_id}`} className="text-emerald-500 hover:underline flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {post.court_name}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Badge de tipo + controles de editar/eliminar (si es mía) */}
        <div className="flex items-center gap-2 shrink-0">
          {post.type === 'open_match' && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
              isDark ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              <Zap className="w-3 h-3 fill-current" /> Partido Abierto
            </span>
          )}
          {post.type === 'match_result' && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}>
              <Trophy className="w-3 h-3" /> Marcador
            </span>
          )}

          {isOwnPost && !isEditingPost && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setEditContent(post.content); setEditError(''); setIsEditingPost(true); }}
                title="Editar publicación"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeletePost}
                disabled={deletePostMutation.isPending}
                title="Eliminar publicación"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-3">
        {isEditingPost ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 border resize-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            {editError && <p className="text-xs text-red-500">{editError}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={updatePostMutation.isPending || !editContent.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> {updatePostMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setIsEditingPost(false)}
                className={`font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{post.content}</p>
        )}

        {taggedUsers.length > 0 && (
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Con{' '}
            {taggedUsers.map((u, i) => (
              <React.Fragment key={u.id}>
                <Link to={`/profile/${u.id}`} className="font-semibold text-emerald-500 hover:underline">{u.full_name}</Link>
                {i < taggedUsers.length - 1 && (i === taggedUsers.length - 2 ? ' y ' : ', ')}
              </React.Fragment>
            ))}
          </p>
        )}

        {/* SPECIAL RENDER: Match Result Card */}
        {post.type === 'match_result' && post.score && (
          <div className={`border rounded-xl p-3 flex items-center justify-around text-center ${
            isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pareja A</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{post.players_tagged?.[0]} / {post.players_tagged?.[1]}</p>
            </div>
            <div className={`border px-3 py-1 rounded-xl ${
              isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-800'
            }`}>
              <span className="font-mono font-black text-sm">{post.score.set1} • {post.score.set2}</span>
            </div>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pareja B</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{post.players_tagged?.[2]} / {post.players_tagged?.[3]}</p>
            </div>
          </div>
        )}

        {/* SPECIAL RENDER: Open Match Card */}
        {post.type === 'open_match' && (() => {
          const isFlexible = post.open_match_details?.is_flexible_date || post.open_match_details?.date === 'Partido Abierto' || post.open_match_details?.time === 'A convenir' || post.open_match_details?.time === 'Fecha a convenir';
          const courtName = post.court_name || 'la cancha';
          const dynamicMsg = (!isFlexible && post.open_match_details?.date && post.open_match_details?.time && post.open_match_details?.date !== 'Partido Abierto')
            ? `Hola ${authorName}! Me quiero sumar al partido que estás organizando en ${courtName} el ${post.open_match_details.date} a las ${post.open_match_details.time}.`
            : `Hola ${authorName}! Me quiero sumar al partido que estás organizando en ${courtName}. ¿Qué día y a qué hora podemos coordinar?`;

          return (
            <div className={`border rounded-2xl p-4 space-y-3 shadow-md ${
              isDark
                ? 'bg-gradient-to-r from-slate-800/90 to-slate-800/50 border-amber-400/40 text-white'
                : 'bg-slate-50 border-amber-400/60 text-slate-900'
            }`}>
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isDark ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {post.open_match_details?.search_type === 'partner' ? '👥 Buscando Pareja' : '⚡ Buscando 4to Jugador'}
                  </span>
                  <h4 className={`font-bold text-sm mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Organiza <Link to={`/profile/${post.author_id}`} className="hover:underline text-emerald-500">{authorName}</Link>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {isFlexible
                      ? 'Fecha y hora a convenir / Partido Abierto'
                      : `${post.open_match_details?.date || 'Hoy'} • ${post.open_match_details?.time || ''}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`font-black text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{post.open_match_details?.price_per_player || '$1.200'}</span>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>por jugador</p>
                </div>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
                <span className={`text-xs font-semibold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {courtName}
                </span>

                {post.author_id === user?.id ? (
                  <span className={`font-bold text-xs px-3 py-1.5 rounded-xl border ${
                    isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}>
                    Tu publicación
                  </span>
                ) : (
                  <Link
                    to={`/chat?user=${post.author_id}&msg=${encodeURIComponent(dynamicMsg)}`}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    <span>Me quiero sumar</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })()}

        {/* Media Image if available */}
        {post.media_url && (
          <div className="rounded-xl overflow-hidden aspect-[4/3] border border-slate-200 dark:border-slate-800">
            <img src={post.media_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Action Stats */}
      <div className={`px-4 py-2.5 border-t flex items-center justify-between text-xs ${
        isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-600'
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors font-medium cursor-pointer ${
              isLiked ? 'text-emerald-500 font-bold' : isDark ? 'hover:text-white' : 'hover:text-slate-900'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-emerald-500 text-emerald-500' : ''}`} />
            <span>{likes.length}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 transition-colors font-medium cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{comments.length}</span>
          </button>
        </div>

        <button className={`flex items-center gap-1 transition-colors cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>
          <Share2 className="w-3.5 h-3.5" />
          <span>Compartir</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className={`p-4 border-t space-y-3 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          {comments.length === 0 && (
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sé el primero en comentar.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5 items-start text-xs group">
              <img src={c.author_avatar} alt="" className="w-6 h-6 rounded-lg object-cover mt-0.5" />
              <div className={`rounded-xl p-2.5 flex-1 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{c.author_name}</span>
                <p className={`mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{c.content}</p>
              </div>
              {c.author_id === user?.id && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  disabled={deleteCommentMutation.isPending}
                  title="Eliminar comentario"
                  className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50 ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {commentError && <p className="text-[11px] text-red-500">{commentError}</p>}

          {/* Add comment form — el club puede haber desactivado comentarios
              en sus publicaciones (interruptor general, panel del club) */}
          {commentsAllowed ? (
            <form onSubmit={handleComment} className="flex flex-wrap gap-2 pt-1">
              {availableDemoUsers.length > 0 && (
                <select
                  value={commentAsId}
                  onChange={(e) => setCommentAsId(e.target.value)}
                  title="Comentar a nombre de un usuario demo"
                  className={`rounded-xl px-2 py-1.5 text-[11px] border focus:outline-none focus:border-emerald-500 w-full sm:w-auto ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <option value="">Comentar como vos</option>
                  {availableDemoUsers.map(d => (
                    <option key={d.id} value={d.id}>Como {d.full_name}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder="Escribí un comentario..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={addCommentMutation.isPending || createDemoComment.isPending}
                className={`flex-1 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 border disabled:opacity-60 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                }`}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || addCommentMutation.isPending || createDemoComment.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <p className={`flex items-center gap-1.5 text-[11px] pt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Lock className="w-3 h-3" /> Este club desactivó los comentarios en sus publicaciones.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

