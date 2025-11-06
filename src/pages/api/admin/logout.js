export const prerender = false;

export async function POST({ cookies, redirect }) {
  try {
    // Eliminar la cookie de sesión del administrador
    cookies.delete('admin_session', {
      path: '/'
    });
    
    // Retornar respuesta exitosa
    return new Response(JSON.stringify({ success: true, message: 'Sesión cerrada correctamente' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return new Response(JSON.stringify({ success: false, message: 'Error al cerrar sesión' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}