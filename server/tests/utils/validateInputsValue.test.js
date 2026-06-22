const { validateEmail, validateInput, validateRole } = require('../../src/utils/validateInputsValue');

describe('validateEmail', () => {
  test('retorna error si el email está vacío', () => {
    const result = validateEmail('   ');
    expect(result.success).toBe(false);
    expect(result.error).toBe('No puede dejar este campo vacio');
  });

  test('retorna error si el email no tiene dominio @nur.edu.bo', () => {
    const result = validateEmail('usuario@gmail.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Formato de email invalido');
  });

  test('retorna error si el dominio es parcialmente correcto', () => {
    const result = validateEmail('usuario@nur.edu');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Formato de email invalido');
  });

  test('retorna success con email válido NUR', () => {
    const result = validateEmail('usuario@nur.edu.bo');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('retorna success con email válido NUR con subdirección', () => {
    const result = validateEmail('juan.perez@nur.edu.bo');
    expect(result.success).toBe(true);
  });
});

describe('validateInput', () => {
  test('retorna error si el valor está vacío', () => {
    const result = validateInput('');
    expect(result.success).toBe(false);
    expect(result.error).toBe('No puede dejar este campo vacio');
  });

  test('retorna error si el valor solo tiene espacios', () => {
    const result = validateInput('   ');
    expect(result.success).toBe(false);
    expect(result.error).toBe('No puede dejar este campo vacio');
  });

  test('retorna success con valor no vacío', () => {
    const result = validateInput('Hola mundo');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('retorna success con un solo carácter', () => {
    const result = validateInput('a');
    expect(result.success).toBe(true);
  });
});

describe('validateRole', () => {
  test('retorna error con rol desconocido', () => {
    const result = validateRole('superuser');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Rol inválido');
  });

  test('retorna error con rol vacío', () => {
    const result = validateRole('');
    expect(result.success).toBe(false);
  });

  test('retorna success con rol admin', () => {
    expect(validateRole('admin').success).toBe(true);
  });

  test('retorna success con rol creator', () => {
    expect(validateRole('creator').success).toBe(true);
  });

  test('retorna success con rol respondent', () => {
    expect(validateRole('respondent').success).toBe(true);
  });
});
