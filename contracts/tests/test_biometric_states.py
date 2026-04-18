"""BIO-001: regresión de whitelist de estados biométricos.

El vocabulario nuevo (`pending_*`) coexiste con el legacy (`tenant_biometric`,
etc.) escrito por `contracts/unified_contract_api.py` y
`contracts/codeudor_public_api.py`. La whitelist debe aceptar ambos para que
el flujo biométrico no bloquee contratos válidos en producción.
"""

from django.test import TestCase

from contracts.constants import (
    STATES_READY_FOR_BIOMETRIC,
    ContractState,
)


class BiometricStateWhitelistTests(TestCase):
    def test_accepts_new_vocabulary(self):
        for state in (
            ContractState.PENDING_TENANT_BIOMETRIC.value,
            ContractState.PENDING_GUARANTOR_BIOMETRIC.value,
            ContractState.PENDING_LANDLORD_BIOMETRIC.value,
            ContractState.READY_FOR_AUTHENTICATION.value,
            ContractState.PENDING_BIOMETRIC.value,
            ContractState.PENDING_AUTHENTICATION.value,
        ):
            self.assertIn(state, STATES_READY_FOR_BIOMETRIC)

    def test_accepts_legacy_variants_without_prefix(self):
        for state in ('tenant_biometric', 'guarantor_biometric', 'landlord_biometric'):
            self.assertIn(
                state,
                STATES_READY_FOR_BIOMETRIC,
                f'El estado legacy {state!r} debe aceptarse hasta el refactor UX-E2E-02.',
            )

    def test_rejects_unrelated_states(self):
        for state in ('draft', 'active', 'terminated', 'cancelled'):
            self.assertNotIn(state, STATES_READY_FOR_BIOMETRIC)


class BiometricServiceStartRejectsInvalidState(TestCase):
    """Valida que el servicio rechaza un estado fuera de la whitelist."""

    def test_raises_value_error_for_active_contract(self):
        from unittest.mock import MagicMock
        from contracts.biometric_service import BiometricAuthenticationService

        service = BiometricAuthenticationService()
        contract = MagicMock()
        contract.status = 'active'
        contract.primary_party = MagicMock()
        contract.secondary_party = MagicMock()
        contract.guarantor = None
        user = contract.primary_party
        request = MagicMock()

        with self.assertRaisesMessage(ValueError, 'estado válido'):
            service.initiate_authentication(contract, user, request)

    def test_legacy_state_does_not_raise_invalid_state(self):
        """Con BIO-001, un contrato en `tenant_biometric` (sin prefix) NO debe
        disparar el ValueError de estado inválido. Puede fallar después por
        otras razones (mocks incompletos), pero el mensaje de estado debe pasar.
        """
        from unittest.mock import MagicMock
        from contracts.biometric_service import BiometricAuthenticationService

        service = BiometricAuthenticationService()
        contract = MagicMock()
        contract.status = 'tenant_biometric'
        user = MagicMock()
        contract.primary_party = user
        contract.secondary_party = MagicMock()
        contract.guarantor = None
        request = MagicMock()

        try:
            service.initiate_authentication(contract, user, request)
        except ValueError as exc:
            self.assertNotIn('estado válido', str(exc))
        except Exception:
            # Cualquier otra excepción es aceptable (mocks incompletos).
            pass
