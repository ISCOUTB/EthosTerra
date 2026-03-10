module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // Deshabilita errores por uso de 'any'
    '@typescript-eslint/no-unused-vars': 'off', // Deshabilita errores por variables no usadas
    'react/no-unescaped-entities': 'off',       // Deshabilita errores por caracteres no escapados
    'react-hooks/exhaustive-deps': 'off',       // Deshabilita advertencias por dependencias faltantes en useEffect
    'react/jsx-key': 'off',                     // Deshabilita errores por falta de 'key' en iteradores
    '@typescript-eslint/no-empty-object-type': 'off', // Deshabilita errores por interfaces vacías
  },
};
