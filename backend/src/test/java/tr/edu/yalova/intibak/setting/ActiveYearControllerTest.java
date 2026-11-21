package tr.edu.yalova.intibak.setting;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import tr.edu.yalova.intibak.security.SecurityConfig;
import tr.edu.yalova.intibak.user.Role;
import tr.edu.yalova.intibak.user.UserResponse;
import tr.edu.yalova.intibak.user.UserService;

/** Aktif yıl endpoint'leri: giriş zorunlu, değiştirenin görünen adı servise iletilir. */
@WebMvcTest(ActiveYearController.class)
@Import(SecurityConfig.class)
class ActiveYearControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActiveYearService activeYearService;

    @MockitoBean
    private UserService userService;

    @Test
    void needsLogin() throws Exception {
        mockMvc.perform(get("/api/settings/active-year")).andExpect(status().isUnauthorized());
    }

    @Test
    void savesWithTheCurrentDisplayName() throws Exception {
        when(userService.get(Role.UYE_1)).thenReturn(new UserResponse(Role.UYE_1, "Üye 1", "Dr. Deneme", true));
        when(activeYearService.set(2027, "Dr. Deneme")).thenReturn(new ActiveYearService.ActiveYear(
                2027, "2027-2028", "Dr. Deneme", null, List.of()));

        mockMvc.perform(put("/api/settings/active-year").with(user("UYE_1")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"startYear\":2027}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("2027-2028"))
                .andExpect(jsonPath("$.updatedByName").value("Dr. Deneme"));
        verify(activeYearService).set(2027, "Dr. Deneme");
    }

    @Test
    void missingYearIsRejected() throws Exception {
        mockMvc.perform(put("/api/settings/active-year").with(user("UYE_1")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Yıl girilmelidir."));
    }
}
