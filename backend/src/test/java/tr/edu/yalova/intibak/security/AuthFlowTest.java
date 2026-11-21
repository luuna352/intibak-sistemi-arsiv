package tr.edu.yalova.intibak.security;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tr.edu.yalova.intibak.common.LoginFailedException;
import tr.edu.yalova.intibak.user.AppUser;
import tr.edu.yalova.intibak.user.Role;
import tr.edu.yalova.intibak.user.UserController;
import tr.edu.yalova.intibak.user.UserResponse;
import tr.edu.yalova.intibak.user.UserService;

/**
 * Giriş akışı web katmanında: güvenlik kuralları (SecurityConfig) gerçek, servisler sahte (mock).
 * Veritabanı gerekmez.
 */
@WebMvcTest({AuthController.class, UserController.class})
@Import(SecurityConfig.class)
class AuthFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LoginService loginService;

    @MockitoBean
    private UserService userService;

    @Test
    void roleListIsOpenWithoutLogin() throws Exception {
        mockMvc.perform(get("/api/auth/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].role").value("KOMISYON_BASKANI"))
                .andExpect(jsonPath("$[0].label").value("Komisyon Başkanı"));
    }

    @Test
    void apiNeedsLogin() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithoutCsrfTokenIsForbidden() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"UYE_1\",\"password\":\"dogru-sifre\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void wrongPasswordReturns401WithMessage() throws Exception {
        when(loginService.login(Role.UYE_1, "yanlis")).thenThrow(new LoginFailedException());

        mockMvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"UYE_1\",\"password\":\"yanlis\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Şifre hatalı."));
    }

    @Test
    void loginKeepsUserInSessionForLaterRequests() throws Exception {
        AppUser user = mock(AppUser.class);
        when(user.getRole()).thenReturn(Role.UYE_1);
        when(user.getDisplayName()).thenReturn("Dr. Öğr. Üyesi Deneme");
        when(user.hasPassword()).thenReturn(true);
        when(loginService.login(Role.UYE_1, "dogru-sifre")).thenReturn(new LoginService.LoginResult(user, false));
        UserResponse me = new UserResponse(Role.UYE_1, "Üye 1", "Dr. Öğr. Üyesi Deneme", true);
        when(userService.get(Role.UYE_1)).thenReturn(me);
        when(userService.list()).thenReturn(List.of(me));

        MvcResult login = mockMvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"UYE_1\",\"password\":\"dogru-sifre\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.displayName").value("Dr. Öğr. Üyesi Deneme"))
                .andExpect(jsonPath("$.passwordCreated").value(false))
                .andReturn();
        // Girişten sonraki istekler aynı session ile gelir (tarayıcıdaki JSESSIONID cookie'sinin karşılığı).
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("UYE_1"));
        mockMvc.perform(get("/api/users").session(session)).andExpect(status().isOk());
        mockMvc.perform(post("/api/users/SEKRETER/reset-password").session(session).with(csrf()))
                .andExpect(status().isNoContent());
        verify(userService).resetPassword(Role.SEKRETER);
    }

    @Test
    void blankDisplayNameIsRejected() throws Exception {
        mockMvc.perform(put("/api/users/UYE_1/display-name").with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                                .user("UYE_1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Görünen ad boş olamaz."));
        verify(userService, org.mockito.Mockito.never()).updateDisplayName(eq(Role.UYE_1), org.mockito.ArgumentMatchers.any());
    }
}
