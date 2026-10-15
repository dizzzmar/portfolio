// 404 · sincroniza el movimiento del cielo con el reloj para que esté en el mismo punto en todas las páginas.

// Start the 80s drift cycle from the clock, so the sky is in the same place on every page
document.querySelector('.sky').style.animationDelay = -(Date.now() / 1000 % 80) + 's';
